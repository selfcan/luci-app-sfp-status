'use strict';
'require view';
'require form';
'require rpc';
'require uci';

var callGetStatus = rpc.declare({
	object: 'luci.adguardhome',
	method: 'getStatus',
	expect: { '': {} }
});

var callGetMeta = rpc.declare({
	object: 'luci.adguardhome',
	method: 'getMeta',
	expect: { '': {} }
});

var callStartUpdate = rpc.declare({
	object: 'luci.adguardhome',
	method: 'startUpdate',
	params: [ 'force' ],
	expect: { '': {} }
});

var callGfwAction = rpc.declare({
	object: 'luci.adguardhome',
	method: 'gfwAction',
	params: [ 'action' ],
	expect: { '': {} }
});

var callSetLinks = rpc.declare({
	object: 'luci.adguardhome',
	method: 'setLinks',
	params: [ 'content' ],
	expect: { '': {} }
});

function hasChineseLocale() {
	if (typeof document === 'undefined')
		return false;

	var bodyClass = document.body ? (document.body.className || '') : '';
	var htmlLang = document.documentElement ? (document.documentElement.lang || '') : '';

	return /\blang_zh(?:[-_][^\s]+)?\b/i.test(bodyClass) || /^zh(?:-|_|$)/i.test(htmlLang);
}

function t(message, fallback) {
	var translated = _(message);

	if (translated !== message || !fallback || !hasChineseLocale())
		return translated;

	return fallback;
}

function ensureObject(value) {
	return (value && typeof value === 'object' && !Array.isArray(value)) ? value : {};
}

function ensureArray(value) {
	return Array.isArray(value) ? value : [];
}

function ensureConfigSection() {
	var sections = uci.sections('AdGuardHome', 'AdGuardHome') || [];
	var hasNamedSection = sections.some(function(section) {
		return section && section['.name'] === 'AdGuardHome';
	});

	if (!hasNamedSection)
		uci.add('AdGuardHome', 'AdGuardHome', 'AdGuardHome');
}

function addStatusNotice(node, type, text) {
	node.className = 'adh-inline-status adh-inline-status-' + type;
	node.textContent = text;
}

function loadScript(url, id) {
	return new Promise(function(resolve, reject) {
		var existing = document.getElementById(id);

		if (existing) {
			if (existing.dataset.loaded === '1') {
				resolve();
				return;
			}

			existing.addEventListener('load', function() { resolve(); }, { once: true });
			existing.addEventListener('error', reject, { once: true });
			return;
		}

		var script = E('script', { id: id, src: url });
		script.addEventListener('load', function() {
			script.dataset.loaded = '1';
			resolve();
		}, { once: true });
		script.addEventListener('error', reject, { once: true });
		document.head.appendChild(script);
	});
}

function ensureBcrypt() {
	if (window.TwinBcrypt)
		return Promise.resolve(window.TwinBcrypt);

	return loadScript(L.resource('twin-bcrypt.min.js'), 'adh-bcrypt-script').then(function() {
		if (!window.TwinBcrypt)
			throw new Error('TwinBcrypt unavailable');

		return window.TwinBcrypt;
	});
}

var pageStyle = [
	'.adh-settings-page { display:grid; gap:18px; }',
	'.adh-hero { position:relative; overflow:hidden; border-radius:24px; padding:26px; color:#f3f7f5; background:linear-gradient(135deg,#15384a 0%,#1d5b66 48%,#6a7b37 100%); box-shadow:0 18px 38px rgba(14,30,37,.14); }',
	'.adh-hero:before { content:""; position:absolute; right:-70px; top:-70px; width:220px; height:220px; border-radius:50%; background:radial-gradient(circle, rgba(255,241,177,.26), rgba(255,241,177,0)); }',
	'.adh-hero-grid { position:relative; z-index:1; display:grid; gap:18px; grid-template-columns:minmax(0,1.4fr) minmax(280px,.8fr); }',
	'.adh-hero h2 { margin:0; font-size:31px; font-weight:700; color:#ffffff; }',
	'.adh-hero p { margin:10px 0 0; max-width:56rem; line-height:1.75; color:rgba(243,247,245,.88); }',
	'.adh-chip-row { display:flex; flex-wrap:wrap; gap:10px; margin-top:18px; }',
	'.adh-chip { display:inline-flex; align-items:center; gap:8px; padding:8px 13px; border-radius:999px; background:rgba(255,255,255,.13); border:1px solid rgba(255,255,255,.12); font-size:12px; color:#ffffff; }',
	'.adh-chip:before { content:""; width:8px; height:8px; border-radius:50%; background:rgba(255,255,255,.75); }',
	'.adh-chip-ok:before { background:#79e0a8; }',
	'.adh-chip-warn:before { background:#ffd36d; }',
	'.adh-chip-bad:before { background:#ff8d7a; }',
	'.adh-summary-card { padding:18px; border-radius:20px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.12); backdrop-filter:blur(10px); }',
	'.adh-summary-card strong { display:block; margin-top:8px; font-size:1.18rem; color:#fff; }',
	'.adh-summary-card span { display:block; font-size:12px; line-height:1.6; color:rgba(243,247,245,.78); }',
	'.adh-settings-page .cbi-map { margin:0; border-radius:22px; border:1px solid rgba(24,64,74,.10); box-shadow:0 16px 34px rgba(18,46,52,.10); overflow:hidden; background:linear-gradient(180deg,rgba(251,252,250,.98),rgba(243,247,244,.98)); }',
	'.adh-settings-page .cbi-map > h2 { margin:0; padding:22px 24px 0; font-size:1.36rem; color:#16363e; }',
	'.adh-settings-page .cbi-map > .cbi-map-descr { padding:10px 24px 0; color:#4e6870; line-height:1.75; }',
	'.adh-settings-page .cbi-section { margin:0; border:0; box-shadow:none; background:transparent; }',
	'.adh-settings-page .cbi-section-node { padding-top:6px; background:transparent; }',
	'.adh-settings-page .cbi-value { padding:14px 20px; border-top:1px solid rgba(22,54,62,.08); }',
	'.adh-settings-page input[type="text"], .adh-settings-page input[type="password"], .adh-settings-page textarea, .adh-settings-page select { border-radius:12px; border-color:rgba(22,54,62,.16); box-shadow:none; }',
	'.adh-action-grid { display:grid; gap:18px; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); }',
	'.adh-action-card { padding:20px; border-radius:22px; border:1px solid rgba(22,54,62,.10); background:linear-gradient(180deg,#fcfdfb,#f1f6f3); box-shadow:0 14px 30px rgba(18,46,52,.08); }',
	'.adh-action-card h3 { margin:0; font-size:1.15rem; color:#16363e; }',
	'.adh-action-card p { margin:10px 0 0; line-height:1.7; color:#51686f; }',
	'.adh-action-card textarea, .adh-action-card input { width:100%; margin-top:14px; }',
	'.adh-action-row { display:flex; flex-wrap:wrap; gap:10px; margin-top:14px; }',
	'.adh-inline-status { margin-top:14px; padding:12px 14px; border-radius:14px; font-size:13px; line-height:1.7; }',
	'.adh-inline-status-info { background:rgba(29,91,102,.08); color:#204d56; }',
	'.adh-inline-status-success { background:rgba(56,158,94,.10); color:#19643b; }',
	'.adh-inline-status-warning { background:rgba(214,149,39,.12); color:#8e5f11; }',
	'.adh-inline-status-error { background:rgba(209,73,91,.12); color:#8e2f3f; }',
	'.adh-link-note { margin-top:10px; font-size:12px; line-height:1.6; color:#60747a; }',
	'@media screen and (max-width: 920px) { .adh-hero-grid { grid-template-columns:1fr; } }'
].join('\n');

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('AdGuardHome'),
			L.resolveDefault(callGetStatus(), {}),
			L.resolveDefault(callGetMeta(), {})
		]);
	},

	renderHero: function(status) {
		return E('div', { 'class': 'adh-hero' }, [
			E('style', {}, pageStyle),
			E('div', { 'class': 'adh-hero-grid' }, [
				E('div', {}, [
					E('h2', {}, t('AdGuard Home Settings', 'AdGuard Home 设置中心')),
					E('p', {}, t('Manage service startup, redirect mode, workdir persistence, update mirrors and gfw helper actions from the new modern LuCI entry.', '在新的 modern LuCI 入口里统一管理服务启动、重定向模式、工作目录持久化、更新镜像和 gfw 辅助动作。')),
					E('div', { 'class': 'adh-chip-row' }, [
						E('span', { 'class': 'adh-chip ' + (status.running ? 'adh-chip-ok' : 'adh-chip-bad') }, status.running ? t('Service running', '服务运行中') : t('Service stopped', '服务未运行')),
						E('span', { 'class': 'adh-chip ' + (status.core_ready ? 'adh-chip-ok' : 'adh-chip-bad') }, status.core_ready ? t('Core ready', '核心已就绪') : t('Core missing', '核心缺失')),
						E('span', { 'class': 'adh-chip ' + (status.redirect ? 'adh-chip-warn' : 'adh-chip-ok') }, status.redirect ? t('Port redirect enabled', '端口重定向已开启') : t('Port redirect disabled', '端口重定向未开启')),
						E('span', { 'class': 'adh-chip ' + (status.config_dirty ? 'adh-chip-warn' : 'adh-chip-ok') }, status.config_dirty ? t('Pending YAML draft', '存在待提交 YAML 临时稿') : t('YAML synced', 'YAML 已同步'))
					])
				]),
				E('div', { 'style': 'display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr))' }, [
					E('div', { 'class': 'adh-summary-card' }, [
						E('span', {}, t('Current core version', '当前核心版本')),
						E('strong', {}, status.version || t('Unknown', '未知'))
					]),
					E('div', { 'class': 'adh-summary-card' }, [
						E('span', {}, t('Web console port', 'Web 控制台端口')),
						E('strong', {}, status.httpport || '3000')
					]),
					E('div', { 'class': 'adh-summary-card' }, [
						E('span', {}, t('DNS listening port', 'DNS 监听端口')),
						E('strong', {}, status.dns_port || '?')
					]),
					E('div', { 'class': 'adh-summary-card' }, [
						E('span', {}, t('Current redirect mode', '当前重定向模式')),
						E('strong', {}, status.redirect_mode || t('None', '无'))
					])
				])
			])
		]);
	},

	renderActionCards: function(mapNode, status, meta) {
		status = ensureObject(status);
		meta = ensureObject(meta);

		var gfwStatus = E('div', { 'class': 'adh-inline-status adh-inline-status-info' }, meta.gfw_added ? t('The gfwlist block is currently injected into the YAML config.', '当前 YAML 配置中已注入 gfwlist 规则块。') : t('The gfwlist block has not been injected yet.', '当前 YAML 配置尚未注入 gfwlist 规则块。'));
		var linksBox = E('textarea', { rows: 7, wrap: 'soft' }, [ meta.download_links || '' ]);
		var linksStatus = E('div', { 'class': 'adh-inline-status adh-inline-status-info' }, t('Mirror list changes are written to links.txt and used by the core updater.', '这里的镜像列表会直接写入 links.txt，并被核心更新脚本读取。'));
		var passwordInput = E('input', {
			type: 'password',
			placeholder: t('Enter a plain-text password to generate bcrypt', '输入明文密码，自动生成 bcrypt')
		});
		var passwordStatus = E('div', { 'class': 'adh-inline-status adh-inline-status-info' }, t('The generated bcrypt hash will be written into the hashpass field above. Save & Apply afterwards to update users.password in AdGuard Home.', '生成的 bcrypt 哈希会回填到上面的 hashpass 字段。之后执行保存并应用，服务会把它写入 AdGuard Home 的 users.password。'));
		var updateStatus = E('div', { 'class': 'adh-inline-status adh-inline-status-info' }, status.update_running ? t('An update process is already active.', '当前已有更新进程在运行。') : t('No updater process is currently active.', '当前没有更新进程在运行。'));
		var saveLinksBtn = E('button', { 'class': 'btn cbi-button cbi-button-save' }, t('Save mirror list', '保存镜像列表'));
		var hashBtn = E('button', { 'class': 'btn cbi-button' }, t('Generate bcrypt hash', '生成 bcrypt 哈希'));
		var gfwAddBtn = E('button', { 'class': 'btn cbi-button cbi-button-action' }, t('Add gfwlist block', '注入 gfwlist 规则块'));
		var gfwDelBtn = E('button', { 'class': 'btn cbi-button cbi-button-remove' }, t('Remove gfwlist block', '移除 gfwlist 规则块'));
		var updateBtn = E('button', { 'class': 'btn cbi-button cbi-button-action' }, t('Start standard update', '启动标准更新'));
		var forceUpdateBtn = E('button', { 'class': 'btn cbi-button cbi-button-negative' }, t('Force update core', '强制更新核心'));

		function syncGfwState(added, output) {
			addStatusNotice(gfwStatus, added ? 'success' : 'warning', added ? t('The gfwlist block is now present in the YAML config.', 'gfwlist 规则块现在已经写入 YAML 配置。') : t('The gfwlist block is currently absent from the YAML config.', '当前 YAML 配置中没有 gfwlist 规则块。'));
			if (output)
				gfwStatus.textContent += ' ' + output;
		}

		saveLinksBtn.addEventListener('click', function(ev) {
			ev.preventDefault();
			addStatusNotice(linksStatus, 'info', t('Saving mirror list...', '正在保存镜像列表...'));
			callSetLinks(linksBox.value).then(function() {
				addStatusNotice(linksStatus, 'success', t('Mirror list saved. The next update run will use this content.', '镜像列表已保存，下一次更新就会使用这里的内容。'));
			}).catch(function(err) {
				addStatusNotice(linksStatus, 'error', t('Failed to save mirror list: ', '保存镜像列表失败：') + err.message);
			});
		});

		hashBtn.addEventListener('click', function(ev) {
			ev.preventDefault();
			addStatusNotice(passwordStatus, 'info', t('Generating bcrypt hash...', '正在生成 bcrypt 哈希...'));

			ensureBcrypt().then(function(bcrypt) {
				var hashField = mapNode.querySelector('input[name$=".hashpass"]');

				if (!hashField)
					throw new Error(t('hashpass field not found', '未找到 hashpass 字段'));
				if (!passwordInput.value)
					throw new Error(t('Password is empty', '密码为空'));

				hashField.value = bcrypt.hashSync(passwordInput.value, bcrypt.genSalt(10));
				hashField.dispatchEvent(new Event('input', { bubbles: true }));
				passwordInput.value = '';
				addStatusNotice(passwordStatus, 'success', t('bcrypt hash generated and inserted into the form. Save & Apply to activate it.', 'bcrypt 哈希已生成并写入表单，接下来执行保存并应用即可生效。'));
			}).catch(function(err) {
				addStatusNotice(passwordStatus, 'error', t('Failed to generate bcrypt hash: ', '生成 bcrypt 哈希失败：') + err.message);
			});
		});

		gfwAddBtn.addEventListener('click', function(ev) {
			ev.preventDefault();
			addStatusNotice(gfwStatus, 'info', t('Running gfw helper...', '正在执行 gfw 辅助脚本...'));
			callGfwAction('add').then(function(response) {
				syncGfwState(!!response.added, response.output || '');
			}).catch(function(err) {
				addStatusNotice(gfwStatus, 'error', t('Failed to run gfw helper: ', '执行 gfw 辅助脚本失败：') + err.message);
			});
		});

		gfwDelBtn.addEventListener('click', function(ev) {
			ev.preventDefault();
			addStatusNotice(gfwStatus, 'info', t('Running gfw helper...', '正在执行 gfw 辅助脚本...'));
			callGfwAction('del').then(function(response) {
				syncGfwState(!!response.added, response.output || '');
			}).catch(function(err) {
				addStatusNotice(gfwStatus, 'error', t('Failed to run gfw helper: ', '执行 gfw 辅助脚本失败：') + err.message);
			});
		});

		updateBtn.addEventListener('click', function(ev) {
			ev.preventDefault();
			addStatusNotice(updateStatus, 'info', t('Scheduling standard update...', '正在调度标准更新...'));
			callStartUpdate(false).then(function(response) {
				if (!response.ok)
					throw new Error(t('Update script is unavailable', '更新脚本不可用'));

				addStatusNotice(updateStatus, 'success', t('Standard update scheduled. Open Runtime Log to observe progress.', '标准更新已调度，可到运行日志页观察输出。'));
			}).catch(function(err) {
				addStatusNotice(updateStatus, 'error', t('Failed to start update: ', '启动更新失败：') + err.message);
			});
		});

		forceUpdateBtn.addEventListener('click', function(ev) {
			ev.preventDefault();
			addStatusNotice(updateStatus, 'info', t('Scheduling forced update...', '正在调度强制更新...'));
			callStartUpdate(true).then(function(response) {
				if (!response.ok)
					throw new Error(t('Update script is unavailable', '更新脚本不可用'));

				addStatusNotice(updateStatus, 'success', t('Forced update scheduled. Open Runtime Log to observe progress.', '强制更新已调度，可到运行日志页观察输出。'));
			}).catch(function(err) {
				addStatusNotice(updateStatus, 'error', t('Failed to start forced update: ', '启动强制更新失败：') + err.message);
			});
		});

		return E('div', { 'class': 'adh-action-grid' }, [
			E('div', { 'class': 'adh-action-card' }, [
				E('h3', {}, t('Update mirrors and password helper', '更新镜像与密码辅助')),
				E('p', {}, t('Keep download mirrors editable from LuCI and generate a bcrypt hash for the browser admin password without going back to the legacy template.', '继续在 LuCI 里维护下载镜像，并直接生成浏览器管理密码的 bcrypt 哈希，不再依赖旧模板。')),
				linksBox,
				E('div', { 'class': 'adh-action-row' }, [ saveLinksBtn, hashBtn ]),
				passwordInput,
				passwordStatus,
				linksStatus
			]),
			E('div', { 'class': 'adh-action-card' }, [
				E('h3', {}, t('gfw helper actions', 'gfw 辅助动作')),
				E('p', {}, t('Reuse the existing gfw2adg.sh behavior through rpcd so that add and remove operations survive the migration away from the Lua controller.', '通过 rpcd 继续复用现有的 gfw2adg.sh 行为，让加入和移除规则块这类动作在迁出 Lua controller 后仍然可用。')),
				E('div', { 'class': 'adh-action-row' }, [ gfwAddBtn, gfwDelBtn ]),
				gfwStatus
			]),
			E('div', { 'class': 'adh-action-card' }, [
				E('h3', {}, t('Core update control', '核心更新控制')),
				E('p', {}, t('Trigger the existing updater through rpcd, then follow the output in the Runtime Log page instead of using the old iframe template.', '通过 rpcd 触发现有的更新脚本，再到运行日志页追踪输出，不再依赖旧版 iframe 模板。')),
				E('div', { 'class': 'adh-action-row' }, [
					updateBtn,
					forceUpdateBtn,
					E('a', { 'class': 'btn cbi-button', 'href': L.url('admin', 'services', 'adguardhome', 'log') }, t('Open Runtime Log', '打开运行日志'))
				]),
				updateStatus,
				E('div', { 'class': 'adh-link-note' }, t('Service-side update behavior is still implemented by update_core.sh; the modern page only changes how you trigger and monitor it.', '服务端的更新逻辑仍然由 update_core.sh 实现；modern 页面只负责新的触发与观察入口。'))
			])
		]);
	},

	render: function(data) {
		var status = ensureObject(data && data[1]);
		var meta = ensureObject(data && data[2]);
		var backupChoices = ensureArray(meta.backup_choices).filter(function(choice) {
			return choice != null && String(choice) !== '';
		});

		ensureConfigSection();

		var m = new form.Map('AdGuardHome', t('AdGuard Home Settings', 'AdGuard Home 设置中心'), t('These options stay in UCI and are now managed by a modern LuCI form. File-backed and script-backed operations remain on dedicated action cards below.', '这些选项继续保存在 UCI 中，并改由 modern LuCI 表单维护。文件型和脚本型动作则放在下方的独立操作卡片里。'));
		var s = m.section(form.NamedSection, 'AdGuardHome', 'AdGuardHome', t('Base service settings', '基础服务设置'));
		var o;
		var backupPath;

		o = s.option(form.Flag, 'enabled', t('Enable service', '启用服务'));
		o.rmempty = false;
		o.default = '0';

		o = s.option(form.Value, 'httpport', t('Browser management port', '网页管理端口'));
		o.datatype = 'port';
		o.rmempty = false;
		o.placeholder = status.httpport || '3000';
		o.default = status.httpport || '3000';

		o = s.option(form.ListValue, 'redirect', t('Redirect mode', '重定向模式'));
		o.value('none', t('None', '无'));
		o.value('dnsmasq-upstream', t('Run as dnsmasq upstream server', '作为 dnsmasq 的上游服务器'));
		o.value('redirect', t('Redirect port 53 to AdGuard Home', '重定向 53 端口到 AdGuard Home'));
		o.value('exchange', t('Use port 53 instead of dnsmasq', '使用 53 端口替换 dnsmasq'));
		o.default = status.redirect_mode || 'none';

		o = s.option(form.Value, 'binpath', t('Binary path', '执行文件路径'));
		o.rmempty = false;
		o.placeholder = status.binpath || '/etc/config/adGuardConfig/AdGuardHome';

		o = s.option(form.ListValue, 'upxflag', t('UPX compression after download', '下载后使用 UPX 压缩'));
		o.value('', t('None', '无'));
		o.value('-1', t('Compress faster', '快速压缩'));
		o.value('-9', t('Compress better', '更高压缩比'));
		o.value('--best', t('Compress best (may be slow)', '最佳压缩（可能较慢）'));
		o.value('--brute', t('Try all methods (slow)', '尝试全部方法（较慢）'));
		o.value('--ultra-brute', t('Try more variants (very slow)', '尝试更多变体（很慢）'));

		o = s.option(form.Value, 'configpath', t('Config path', '配置文件路径'));
		o.rmempty = false;
		o.placeholder = status.configpath || '/etc/config/adGuardConfig/AdGuardHome.yaml';

		o = s.option(form.Value, 'workdir', t('Workdir', '工作目录'));
		o.rmempty = false;
		o.placeholder = status.workdir || '/etc/config/adGuardConfig/workspace';

		o = s.option(form.Value, 'logfile', t('Runtime log file', '运行日志文件'));
		o.placeholder = t('Leave empty to disable, or use syslog', '留空则禁用，或填写 syslog');

		o = s.option(form.Flag, 'verbose', t('Verbose log', '详细日志'));

		o = s.option(form.Value, 'gfwupstream', t('gfwlist upstream DNS', 'gfwlist 上游 DNS'));
		o.placeholder = 'tcp://223.5.5.5';

		o = s.option(form.Value, 'hashpass', t('Browser password bcrypt hash', '浏览器管理密码哈希'));
		o.password = true;
		o.rmempty = true;
		o.description = t('Paste a bcrypt hash directly, or use the helper card below to generate one from a plain-text password.', '可以直接粘贴 bcrypt 哈希，也可以使用下方的辅助卡片从明文密码生成。');

		o = s.option(form.MultiValue, 'upprotect', t('Keep files across sysupgrade', '系统升级时保留文件'));
		o.widget = 'checkbox';
		o.value('$binpath', t('Core binary', '核心执行文件'));
		o.value('$configpath', t('Config file', '配置文件'));
		o.value('$logfile', t('Log file', '日志文件'));
		o.value('$workdir/data/sessions.db', 'sessions.db');
		o.value('$workdir/data/stats.db', 'stats.db');
		o.value('$workdir/data/querylog.json', 'querylog.json');
		o.value('$workdir/data/filters', 'filters');

		o = s.option(form.Flag, 'waitonboot', t('Wait for network before restart on boot', '开机等待网络后再重启'));
		o.default = '1';

		o = s.option(form.MultiValue, 'backupfile', t('Backup workdir files on shutdown', '关机时备份工作目录文件'));
		o.widget = 'checkbox';
		backupChoices.forEach(function(choice) {
			o.value(choice, choice);
		});

		backupPath = s.option(form.Value, 'backupwdpath', t('Backup workdir path', '工作目录备份路径'));
		backupPath.placeholder = '/etc/config/adGuardConfig/workspace';
		backupChoices.forEach(function(choice) {
			backupPath.depends('backupfile', choice);
		});

		o = s.option(form.MultiValue, 'crontab', t('Crontab tasks', '计划任务'));
		o.widget = 'checkbox';
		o.value('autoupdate', t('Auto update core', '自动升级核心'));
		o.value('cutquerylog', t('Auto trim query log', '自动裁剪查询日志'));
		o.value('cutruntimelog', t('Auto trim runtime log', '自动裁剪运行日志'));
		o.value('autohost', t('Auto update IPv6 hosts and restart AdGuard Home', '自动更新 IPv6 hosts 并重启 AdGuard Home'));
		o.value('autogfw', t('Auto update gfwlist and restart AdGuard Home', '自动更新 gfwlist 并重启 AdGuard Home'));

		return m.render().then(L.bind(function(mapNode) {
			return E('div', { 'class': 'adh-settings-page' }, [
				this.renderHero(status),
				mapNode,
				this.renderActionCards(mapNode, status, meta)
			]);
		}, this));
	}
});