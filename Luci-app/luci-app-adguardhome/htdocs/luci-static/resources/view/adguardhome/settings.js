'use strict';
'require view';
'require form';
'require rpc';
'require uci';

var callGetStatus = rpc.declare({ object: 'luci.adguardhome', method: 'getStatus', expect: { '': {} } });
var callGetMeta = rpc.declare({ object: 'luci.adguardhome', method: 'getMeta', expect: { '': {} } });
var callSetLinks = rpc.declare({ object: 'luci.adguardhome', method: 'setLinks', params: [ 'content', 'channel', 'download_arch' ], expect: { '': {} } });
var callStartUpdate = rpc.declare({ object: 'luci.adguardhome', method: 'startUpdate', params: [ 'force' ], expect: { '': {} } });
var callGfwAction = rpc.declare({ object: 'luci.adguardhome', method: 'gfwAction', params: [ 'action' ], expect: { '': {} } });

function hasChineseLocale() {
	var htmlLang = document.documentElement ? (document.documentElement.lang || '') : '';
	var bodyClass = document.body ? (document.body.className || '') : '';
	return /^zh(?:-|_|$)/i.test(htmlLang) || /\blang_zh(?:[-_][^\s]+)?\b/i.test(bodyClass);
}

function t(message, fallback) {
	var translated = _(message);
	return translated !== message || !fallback || !hasChineseLocale() ? translated : fallback;
}

function normalizeChannel(value) {
	return [ 'release', 'beta', 'github', 'custom' ].indexOf(value) >= 0 ? value : 'release';
}

function yes(value) {
	return value === true || value === 1 || value === '1';
}

function text(value, fallback) {
	value = value == null ? '' : String(value);
	return value || fallback || '-';
}

function buildLinks(channel) {
	switch (normalizeChannel(channel)) {
	case 'beta':
		return '# Beta channel\nhttps://static.adguard.com/adguardhome/beta/AdGuardHome_linux_${Arch}.tar.gz\n# Stable fallback\nhttps://static.adguard.com/adguardhome/release/AdGuardHome_linux_${Arch}.tar.gz\n# GitHub fallback\nhttps://github.com/AdguardTeam/AdGuardHome/releases/download/${latest_ver}/AdGuardHome_linux_${Arch}.tar.gz';
	case 'github':
		return '# GitHub release channel\nhttps://github.com/AdguardTeam/AdGuardHome/releases/download/${latest_ver}/AdGuardHome_linux_${Arch}.tar.gz\n# Stable fallback\nhttps://static.adguard.com/adguardhome/release/AdGuardHome_linux_${Arch}.tar.gz';
	default:
		return '# Stable channel\nhttps://static.adguard.com/adguardhome/release/AdGuardHome_linux_${Arch}.tar.gz\n# GitHub fallback\nhttps://github.com/AdguardTeam/AdGuardHome/releases/download/${latest_ver}/AdGuardHome_linux_${Arch}.tar.gz\n# Beta channel\n#https://static.adguard.com/adguardhome/beta/AdGuardHome_linux_${Arch}.tar.gz';
	}
}

function actionError(err, fallback) {
	var message = err && (err.message || err.toString && err.toString()) || '';
	if (/Object not found/i.test(message))
		return t('The luci.adguardhome rpcd object is not available. Reinstall this package or restart rpcd, then refresh LuCI.', '当前设备没有导出 luci.adguardhome rpcd 后端对象。请重新安装当前软件包或重启 rpcd，然后刷新 LuCI。');
	if (/Method not found/i.test(message))
		return t('The rpcd backend is outdated and does not provide this action. Reinstall this package or restart rpcd, then refresh LuCI.', '当前设备上的 rpcd 后端版本过旧，未提供此操作。请重新安装当前软件包或重启 rpcd，然后刷新 LuCI。');
	return fallback + (message ? ': ' + message : '');
}

function safeCall(promise, fallback) {
	return promise.catch(function(err) {
		return Object.assign({ _rpc_error: err }, fallback || {});
	});
}

function setBusy(button, busy) {
	button.disabled = !!busy;
	button.classList.toggle('spinning', !!busy);
}

function createStatusBox(message) {
	return E('div', { 'class': 'agh-status' }, message || t('Ready.', '就绪。'));
}

function actionHeader(label, title) {
	return E('div', { 'class': 'agh-action-head' }, [
		E('span', { 'class': 'agh-action-badge' }, label),
		E('h3', {}, title)
	]);
}

function runRpcAction(button, statusBox, call, success, fallback) {
	setBusy(button, true);
	return call().then(function() {
		statusBox.textContent = success;
	}).catch(function(err) {
		statusBox.textContent = actionError(err, fallback);
	}).finally(function() {
		setBusy(button, false);
	});
}

function ensureScript(src, id) {
	if (document.getElementById(id))
		return Promise.resolve();
	return new Promise(function(resolve, reject) {
		var script = document.createElement('script');
		script.id = id;
		script.src = src;
		script.onload = resolve;
		script.onerror = reject;
		document.head.appendChild(script);
	});
}

function ensureBcrypt() {
	return ensureScript(L.resource('twin-bcrypt.min.js'), 'agh-bcrypt-script');
}

var style = [
	'.agh-settings{display:grid;gap:18px;color:#203042}',
	'.agh-hero{position:relative;overflow:hidden;border-radius:22px;padding:26px;color:#f7fbf8;background:linear-gradient(135deg,#143f46 0%,#1f6a5d 54%,#75652c 100%);box-shadow:0 18px 38px rgba(15,38,48,.14)}',
	'.agh-hero h2{all:unset;display:block!important;margin:0 0 10px!important;font-size:28px!important;line-height:1.18!important;font-weight:700!important;color:#fff!important;background:transparent!important;border:0!important;box-shadow:none!important}',
	'.agh-hero p{max-width:72rem;margin:0;color:rgba(247,251,248,.86);font-size:14px;line-height:1.75}',
	'.agh-status-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.agh-chip{padding:14px;border-radius:16px;background:#fff;border:1px solid rgba(22,54,62,.1);box-shadow:0 8px 24px rgba(17,48,54,.06);min-width:0}.agh-chip span{display:block;font-size:12px;color:#667084}.agh-chip strong{display:block;margin-top:6px;font-size:18px;line-height:1.2;color:#17373c;word-break:break-word}.agh-ok{color:#1d8b5b!important}.agh-warn{color:#ad7417!important}.agh-bad{color:#c94d5c!important}',
	'.agh-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}',
	'.agh-action{position:relative;display:grid;align-content:start;gap:12px;padding:18px;border-radius:18px;background:linear-gradient(180deg,#fff 0%,#fbfcfc 100%);border:1px solid rgba(22,54,62,.1);box-shadow:0 10px 28px rgba(17,48,54,.07);min-width:0;overflow:hidden}',
	'.agh-action:before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:var(--agh-accent,#1f6a5d)}',
	'.agh-action-head{display:grid;gap:8px;padding-bottom:2px}',
	'.agh-action-badge{display:inline-flex;align-items:center;width:max-content;padding:5px 10px;border-radius:999px;background:rgba(31,106,93,.12);color:#1d6559;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}',
	'.agh-action h3{all:unset;display:block;font-size:17px;line-height:1.35;font-weight:700;color:#17373c}',
	'.agh-action p{margin:0;color:#5e6d79;line-height:1.7;font-size:13px}',
	'.agh-action textarea{width:100%;min-height:150px;border-radius:14px;border-color:rgba(22,54,62,.16);background:rgba(255,255,255,.9);font-family:monospace;font-size:12px;box-sizing:border-box}',
	'.agh-action-update{--agh-accent:#188a5b;background:linear-gradient(180deg,#fff 0%,#f2fbf6 100%)}.agh-action-update .agh-action-badge{background:rgba(24,138,91,.12);color:#176f4c}',
	'.agh-action-links{--agh-accent:#3466b0;background:linear-gradient(180deg,#fff 0%,#f2f7ff 100%)}.agh-action-links .agh-action-badge{background:rgba(52,102,176,.12);color:#2f5b9a}',
	'.agh-action-password{--agh-accent:#a86a2b;background:linear-gradient(180deg,#fff 0%,#fff7ef 100%)}.agh-action-password .agh-action-badge{background:rgba(168,106,43,.12);color:#8b5723}',
	'.agh-action-gfw{--agh-accent:#556b2f;background:linear-gradient(180deg,#fff 0%,#f6f9ee 100%)}.agh-action-gfw .agh-action-badge{background:rgba(85,107,47,.13);color:#556b2f}',
	'.agh-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.agh-row .btn{border-radius:12px}',
	'.agh-row select,.agh-row input{max-width:100%;min-height:34px}',
	'.agh-status{margin-top:12px;padding:10px 12px;border-radius:14px;background:rgba(239,244,245,.92);color:#51606f;font-size:12px;line-height:1.6}',
	'.agh-settings .cbi-map{border-radius:22px;border:1px solid rgba(22,54,62,.1);box-shadow:0 12px 30px rgba(17,48,54,.08);overflow:visible;background:#fff}',
	'.agh-settings .cbi-map>h2,.agh-settings .cbi-map>.cbi-map-descr{display:none}',
	'.agh-settings .cbi-section{margin:0;border:0;box-shadow:none;background:transparent}.agh-settings .cbi-section-node{padding-top:8px;background:transparent;overflow:visible}',
	'.agh-settings .cbi-tabmenu{padding:14px 16px 0;border-bottom:1px solid rgba(22,54,62,.08);background:#f8fbfa}.agh-settings .cbi-tab,.agh-settings .cbi-tab-disabled{border-radius:12px 12px 0 0}.agh-settings .cbi-tabcontainer{padding-top:4px}',
	'.agh-settings .cbi-value{padding:14px 20px;border-top:1px solid rgba(22,54,62,.08)}.agh-settings .cbi-value-title{font-weight:650;color:#17373c}.agh-settings .cbi-value-description{max-width:58rem;color:#667084;line-height:1.55}',
	'.agh-settings input[type="text"],.agh-settings input[type="password"],.agh-settings textarea,.agh-settings select{border-radius:12px;border-color:rgba(22,54,62,.16);box-shadow:none}',
	'.agh-settings .cbi-dropdown,.agh-settings .cbi-dropdown ul{z-index:60}',
	'@media(max-width:1180px){.agh-actions,.agh-status-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
	'@media(max-width:720px){.agh-actions,.agh-status-grid{grid-template-columns:1fr}.agh-hero{padding:20px}.agh-hero h2{font-size:24px!important}}'
].join('\n');

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('AdGuardHome'),
			safeCall(callGetStatus(), {}),
			safeCall(callGetMeta(), { backup_choices: [ 'filters', 'stats.db', 'querylog.json', 'sessions.db' ] })
		]);
	},
	render: function(data) {
		var status = data[1] || {};
		var meta = data[2] || {};
		var linksText = meta.links || buildLinks(status.release_channel);
		var rpcError = status._rpc_error || meta._rpc_error;
		var linksBox = E('textarea', {}, linksText);
		var channelSelect = E('select', {}, [
			E('option', { value: 'release' }, t('Stable', '稳定版')),
			E('option', { value: 'beta' }, t('Beta', '测试版')),
			E('option', { value: 'github' }, 'GitHub'),
			E('option', { value: 'custom' }, t('Custom', '自定义'))
		]);
		var archSelect = E('select', {}, [
			E('option', { value: 'auto' }, t('Auto', '自动')),
			E('option', { value: '386' }, 'i386'), E('option', { value: 'amd64' }, 'x86_64'), E('option', { value: 'armv5' }, 'armv5'), E('option', { value: 'armv6' }, 'armv6'), E('option', { value: 'armv7' }, 'armv7'), E('option', { value: 'arm64' }, 'aarch64'), E('option', { value: 'mips_softfloat' }, 'mips'), E('option', { value: 'mips64_softfloat' }, 'mips64'), E('option', { value: 'mipsle_softfloat' }, 'mipsel'), E('option', { value: 'mips64le_softfloat' }, 'mips64el'), E('option', { value: 'ppc64le' }, 'powerpc64')
		]);

		channelSelect.value = normalizeChannel(status.release_channel);
		archSelect.value = status.downloadarch || 'auto';
		channelSelect.addEventListener('change', function() {
			if (channelSelect.value !== 'custom')
				linksBox.value = buildLinks(channelSelect.value);
		});
		linksBox.addEventListener('input', function() { channelSelect.value = 'custom'; });

		var m = new form.Map('AdGuardHome', 'AdGuard Home', t('Grouped service, network, update and maintenance options. Use Save & Apply after changing UCI settings.', '设置项已按服务、网络、更新和维护分组。修改 UCI 配置后请点击保存并应用。'));
		var s = m.section(form.NamedSection, 'AdGuardHome', 'AdGuardHome', t('Configuration', '配置'));
		s.addremove = false;
		s.anonymous = true;
		s.tab('service', t('Service', '服务'), t('Enable the daemon and define how it starts.', '启用守护进程并设置启动方式。'));
		s.tab('network', t('Network', '网络'), t('Management port and DNS redirect behaviour.', '网页管理端口与 DNS 重定向行为。'));
		s.tab('files', t('Files', '文件'), t('Binary, YAML, workspace and log paths.', '核心文件、YAML、工作目录和日志路径。'));
		s.tab('update', t('Update', '更新'), t('Core update source and startup update behaviour.', '核心更新源和启动更新行为。'));
		s.tab('rules', t('Rules', '规则'), t('GFW list and upstream options.', 'GFW 列表和上游 DNS 选项。'));
		s.tab('maintenance', t('Maintenance', '维护'), t('Backup, upgrade retention and scheduled tasks.', '备份、升级保留和计划任务。'));
		var o;
		o = s.taboption('service', form.Flag, 'enabled', t('Enable service', '启用服务'), t('Start AdGuard Home through procd when this option is enabled.', '启用后通过 procd 启动 AdGuard Home。'));
		o = s.taboption('service', form.Flag, 'waitonboot', t('Wait for network on boot', '开机等待网络'), t('Delay service startup until the network is ready.', '开机时等待网络就绪后再启动服务。'));
		o = s.taboption('service', form.Value, 'hashpass', t('Web password bcrypt hash', 'Web 密码 bcrypt 哈希'), t('Use the password helper above to generate a hash, then save and apply.', '可使用上方密码助手生成哈希，然后保存并应用。')); o.password = true; o.rmempty = true;

		o = s.taboption('network', form.Value, 'httpport', t('Web console port', 'Web 控制台端口'), t('Port used by the AdGuard Home management UI.', 'AdGuard Home 管理界面使用的端口。')); o.datatype = 'port'; o.placeholder = '3000';
		o = s.taboption('network', form.ListValue, 'redirect', t('DNS redirect mode', 'DNS 重定向模式'), t('Choose how LAN DNS traffic is handed to AdGuard Home.', '选择局域网 DNS 流量交给 AdGuard Home 的方式。')); o.value('none', t('None', '无')); o.value('dnsmasq-upstream', t('Use as dnsmasq upstream', '作为 dnsmasq 上游')); o.value('redirect', t('Redirect port 53', '重定向 53 端口')); o.value('exchange', t('Swap with dnsmasq port', '与 dnsmasq 交换端口'));

		o = s.taboption('files', form.Value, 'binpath', t('Core binary path', '核心文件路径'), t('Executable path for the AdGuard Home binary.', 'AdGuard Home 核心可执行文件路径。')); o.placeholder = '/etc/config/adGuardConfig/AdGuardHome'; o.rmempty = false;
		o = s.taboption('files', form.Value, 'configpath', t('YAML config path', 'YAML 配置路径'), t('Main YAML configuration file edited by the YAML editor.', 'YAML 编辑器操作的主配置文件。')); o.placeholder = '/etc/config/adGuardConfig/AdGuardHome.yaml'; o.rmempty = false;
		o = s.taboption('files', form.Value, 'workdir', t('Work directory', '工作目录'), t('Directory that stores filters, statistics, sessions and query logs.', '用于保存过滤器、统计、会话和查询日志的目录。')); o.placeholder = '/etc/config/adGuardConfig/workspace'; o.rmempty = false;
		o = s.taboption('files', form.Value, 'logfile', t('Runtime log file', '运行日志文件'), t('Use syslog to follow system logs, or set a dedicated file path.', '可填 syslog 查看系统日志，也可填写独立日志文件路径。')); o.placeholder = '/tmp/AdGuardHome.log'; o.rmempty = true;
		o = s.taboption('files', form.Flag, 'verbose', t('Verbose runtime log', '详细运行日志'), t('Enable more detailed service output when troubleshooting.', '排查问题时输出更详细的运行日志。'));

		o = s.taboption('update', form.Flag, 'update', t('Check core update on startup', '启动时检查核心更新'), t('Run the updater when the service starts.', '服务启动时自动运行核心更新检查。'));
		o = s.taboption('update', form.ListValue, 'upxflag', t('UPX compression after download', '下载后 UPX 压缩'), t('Optional compression for the downloaded core binary.', '对下载后的核心文件进行可选压缩。')); o.value('', t('Disabled', '禁用')); o.value('-1', t('Fast', '快速')); o.value('-9', t('Better', '更高压缩')); o.value('--best', t('Best', '最佳')); o.value('--brute', t('Brute force', '强力压缩')); o.rmempty = true;

		o = s.taboption('rules', form.Flag, 'gfw', t('Enable GFW upstream rules', '启用 GFW 上游规则'), t('Apply generated upstream rules from gfwlist.', '应用由 gfwlist 生成的上游规则。'));
		o = s.taboption('rules', form.Flag, 'gfwipset', t('Enable GFW ipset file', '启用 GFW ipset 文件'), t('Generate ipset file references for rule based routing.', '生成用于规则分流的 ipset 文件引用。'));
		o = s.taboption('rules', form.Value, 'gfwupstream', t('GFW upstream DNS', 'GFW 上游 DNS'), t('Upstream DNS used by generated GFW rules.', '生成 GFW 规则时使用的上游 DNS。')); o.placeholder = 'tcp://208.67.220.220:5353'; o.rmempty = true;

		o = s.taboption('maintenance', form.MultiValue, 'upprotect', t('Keep files on system upgrade', '系统升级保留文件'), t('Files listed here are added to sysupgrade keep rules.', '这里选择的文件会加入系统升级保留列表。')); o.widget = 'checkbox'; o.value('$binpath', t('Core binary', '核心文件')); o.value('$configpath', t('Config file', '配置文件')); o.value('$logfile', t('Log file', '日志文件')); o.value('$workdir/data/sessions.db', 'sessions.db'); o.value('$workdir/data/stats.db', 'stats.db'); o.value('$workdir/data/querylog.json', 'querylog.json'); o.value('$workdir/data/filters', 'filters');
		o = s.taboption('maintenance', form.Flag, 'backup', t('Backup on shutdown', '停止服务时备份'), t('Copy selected workdir files to the backup path when stopping the service.', '停止服务时将选中的工作目录文件复制到备份路径。'));
		o = s.taboption('maintenance', form.MultiValue, 'backupfile', t('Backup workdir files', '备份工作目录文件'), t('Choose files under the work directory that should be backed up.', '选择需要备份的工作目录文件。')); o.widget = 'checkbox'; (meta.backup_choices || [ 'filters', 'stats.db', 'querylog.json', 'sessions.db' ]).forEach(function(item) { o.value(item, item); });
		o = s.taboption('maintenance', form.Value, 'backupwdpath', t('Backup path', '备份路径'), t('Destination directory for shutdown backups.', '停止服务备份的目标目录。')); o.placeholder = '/etc/config/adGuardConfig/workspace';
		o = s.taboption('maintenance', form.MultiValue, 'crontab', t('Scheduled tasks', '计划任务'), t('Legacy cron jobs managed by the init script.', '由 init 脚本维护的旧版计划任务。')); o.widget = 'checkbox'; o.value('autoupdate', t('Auto update core', '自动更新核心')); o.value('cutquerylog', t('Trim query log', '裁剪查询日志')); o.value('cutruntimelog', t('Trim runtime log', '裁剪运行日志')); o.value('autohost', t('Update IPv6 hosts', '更新 IPv6 hosts')); o.value('autogfw', t('Update GFW list', '更新 GFW 列表')); o.value('autogfwipset', t('Update GFW ipset', '更新 GFW ipset'));

		return m.render().then(function(formNode) {
			return E('div', { 'class': 'agh-settings' }, [
				E('style', {}, style),
				E('section', { 'class': 'agh-hero' }, [ E('h2', {}, t('AdGuard Home Settings', 'AdGuard Home 设置中心')), E('p', {}, t('Operate the service, update the core, manage download sources and tune UCI options from one grouped page.', '在一个分组页面中完成服务控制、核心更新、下载源管理和 UCI 参数调整。')) ]),
				statusSummary(status, rpcError),
				E('section', { 'class': 'agh-actions' }, [ updateCard(rpcError), linksCard(channelSelect, archSelect, linksBox, rpcError), passwordCard(), gfwCard(rpcError) ]),
				formNode
			]);
		});
	}
});

function statusSummary(status, rpcError) {
	return E('section', { 'class': 'agh-status-grid' }, [
		chip(t('Service', '服务'), rpcError ? t('Backend missing', '后端未加载') : (yes(status.running) ? t('Running', '运行中') : t('Stopped', '未运行')), rpcError ? 'agh-bad' : (yes(status.running) ? 'agh-ok' : 'agh-warn')),
		chip(t('Core', '核心'), yes(status.core_ready) ? text(status.version, t('Ready', '就绪')) : t('Missing', '缺失'), yes(status.core_ready) ? 'agh-ok' : 'agh-warn'),
		chip(t('Download', '下载'), normalizeChannel(status.release_channel), ''),
		chip(t('Architecture', '架构'), text(status.downloadarch, 'auto'), '')
	]);
}

function chip(label, value, cls) {
	return E('div', { 'class': 'agh-chip' }, [ E('span', {}, label), E('strong', { 'class': cls || '' }, value) ]);
}

function updateCard(rpcError) {
	var statusBox = createStatusBox(rpcError ? actionError(rpcError, t('RPC backend unavailable', 'RPC 后端不可用')) : t('Ready.', '就绪。'));
	var updateButton = E('button', { 'class': 'btn cbi-button cbi-button-action' }, t('Update', '更新'));
	var forceButton = E('button', { 'class': 'btn cbi-button cbi-button-negative' }, t('Force update', '强制更新'));
	if (rpcError) {
		updateButton.disabled = true;
		forceButton.disabled = true;
	}
	updateButton.addEventListener('click', function() {
		runRpcAction(updateButton, statusBox, function() { return callStartUpdate(false); }, t('Update scheduled.', '已调度更新。'), t('Update failed', '启动更新失败'));
	});
	forceButton.addEventListener('click', function() {
		runRpcAction(forceButton, statusBox, function() { return callStartUpdate(true); }, t('Forced update scheduled.', '已调度强制更新。'), t('Forced update failed', '启动强制更新失败'));
	});
	return E('div', { 'class': 'agh-action agh-action-update' }, [
		actionHeader(t('Version Update', '版本更新'), t('Core Version Update', '核心版本更新')),
		E('p', {}, t('Queue a core upgrade task through rpcd and move to the log page when you need to track output.', '通过 rpcd 调度核心升级任务；需要查看执行输出时，可直接切换到运行日志页面。')),
		E('div', { 'class': 'agh-row' }, [
			updateButton,
			forceButton,
			E('a', { 'class': 'btn cbi-button', 'href': L.url('admin', 'services', 'adguardhome', 'log') }, t('Open Log', '打开日志'))
		]), statusBox
	]);
}

function linksCard(channelSelect, archSelect, linksBox, rpcError) {
	var statusBox = createStatusBox(rpcError ? actionError(rpcError, t('RPC backend unavailable', 'RPC 后端不可用')) : t('Ready.', '就绪。'));
	var saveButton = E('button', { 'class': 'btn cbi-button cbi-button-action' }, t('Save source', '保存源'));
	if (rpcError)
		saveButton.disabled = true;
	saveButton.addEventListener('click', function() {
		runRpcAction(saveButton, statusBox, function() { return callSetLinks(linksBox.value, channelSelect.value, archSelect.value); }, t('Download source saved.', '下载源已保存。'), t('Saving download source failed', '保存下载源失败'));
	});
	return E('div', { 'class': 'agh-action agh-action-links' }, [
		actionHeader(t('Source', '源设置'), t('Download Sources', '下载源与架构')),
		E('p', {}, t('Choose a release channel, confirm the target architecture, or keep a fully custom source list when needed.', '可选择发布通道、确认目标架构，也可以继续维护完整的自定义下载源列表。')),
		E('div', { 'class': 'agh-row' }, [ channelSelect, archSelect, saveButton ]),
		linksBox,
		statusBox
	]);
}


function passwordCard() {
	var statusBox = createStatusBox(t('Generate a hash and it will be filled into the password field below.', '生成哈希后会自动写入下方密码字段。'));
	var input = E('input', { type: 'password', placeholder: t('New web password', '新的网页密码') });
	return E('div', { 'class': 'agh-action agh-action-password' }, [
		actionHeader(t('Security', '安全'), t('Password Hash Helper', '密码哈希助手')),
		E('p', {}, t('Generate a bcrypt hash for the AdGuard Home web console password and write it into the hash field automatically.', '为 AdGuard Home 后台密码生成 bcrypt 哈希，并自动写入下方的哈希字段。')),
		E('div', { 'class': 'agh-row' }, [ input, E('button', { 'class': 'btn cbi-button', 'click': function() { ensureBcrypt().then(function() { var bcrypt = window.TwinBcrypt || (window.dcodeIO && window.dcodeIO.bcrypt); var hash = bcrypt && bcrypt.hashSync ? bcrypt.hashSync(input.value || '', 10) : ''; var target = document.querySelector('[data-name="hashpass"] input'); if (target && hash) { target.value = hash; statusBox.textContent = t('Hash generated and written into the password field.', '哈希已生成，并已写入密码字段。'); } else { statusBox.textContent = t('bcrypt library unavailable or hash generation failed.', 'bcrypt 库不可用，或哈希生成失败。'); } }); } }, t('Generate hash', '生成哈希')) ]),
		statusBox
	]);
}

function gfwCard(rpcError) {
	var statusBox = createStatusBox(rpcError ? actionError(rpcError, t('RPC backend unavailable', 'RPC 后端不可用')) : t('Ready.', '就绪。'));
	function button(action, text, label) {
		var node = E('button', { 'class': 'btn cbi-button' }, text);
		if (rpcError)
			node.disabled = true;
		node.addEventListener('click', function() {
			runRpcAction(node, statusBox, function() { return callGfwAction(action); }, label, t('GFW action failed', 'GFW 操作失败'));
		});
		return node;
	}
	return E('div', { 'class': 'agh-action agh-action-gfw' }, [
		actionHeader(t('Rules', '规则'), t('GFW Rule Tools', 'GFW 规则工具')),
		E('p', {}, t('Keep legacy gfwlist and ipset workflows available as compact maintenance tools for add and cleanup actions.', '保留旧版 gfwlist 与 ipset 工作流，并用紧凑的维护按钮完成添加和清理操作。')),
		E('div', { 'class': 'agh-row' }, [
			button('add', t('Add list', '添加列表'), t('GFW list task started.', 'GFW 列表任务已启动。')),
			button('del', t('Delete list', '删除列表'), t('GFW list delete task started.', 'GFW 列表删除任务已启动。')),
			button('ipset_add', t('Add ipset', '添加 ipset'), t('GFW ipset task started.', 'GFW ipset 任务已启动。')),
			button('ipset_del', t('Delete ipset', '删除 ipset'), t('GFW ipset delete task started.', 'GFW ipset 删除任务已启动。'))
		]),
		statusBox
	]);
}
