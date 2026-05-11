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
	'.agh-hero{position:relative;overflow:hidden;border-radius:24px;padding:26px;color:#f7fbf8;background:linear-gradient(135deg,#143f46 0%,#1f6a5d 52%,#7d6828 100%);box-shadow:0 20px 42px rgba(15,38,48,.16)}',
	'.agh-hero h2{all:unset;display:block!important;margin:0 0 10px!important;font-size:28px!important;line-height:1.18!important;font-weight:700!important;color:#fff!important;background:transparent!important;border:0!important;box-shadow:none!important}',
	'.agh-hero p{max-width:72rem;margin:0;color:rgba(247,251,248,.86);font-size:14px;line-height:1.75}',
	'.agh-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}',
	'.agh-action{padding:18px;border-radius:20px;background:#fff;border:1px solid rgba(22,54,62,.1);box-shadow:0 12px 30px rgba(17,48,54,.08);min-width:0}',
	'.agh-action h3{margin:0 0 8px;font-size:16px;color:#17373c}.agh-action p{margin:0 0 14px;color:#667084;line-height:1.6;font-size:13px}',
	'.agh-action textarea{width:100%;min-height:168px;border-radius:14px;border-color:rgba(22,54,62,.16);font-family:monospace;font-size:12px;box-sizing:border-box}',
	'.agh-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.agh-row .btn{border-radius:12px}',
	'.agh-status{margin-top:12px;padding:10px 12px;border-radius:14px;background:#f3f7f7;color:#51606f;font-size:12px;line-height:1.55}',
	'.agh-settings .cbi-map{border-radius:22px;border:1px solid rgba(22,54,62,.1);box-shadow:0 12px 30px rgba(17,48,54,.08);overflow:visible;background:#fff}',
	'.agh-settings .cbi-map>h2,.agh-settings .cbi-map>.cbi-map-descr{display:none}',
	'.agh-settings .cbi-section{margin:0;border:0;box-shadow:none;background:transparent}.agh-settings .cbi-section-node{padding-top:6px;background:transparent;overflow:visible}',
	'.agh-settings .cbi-value{padding:14px 20px;border-top:1px solid rgba(22,54,62,.08)}.agh-settings .cbi-value-title{font-weight:600;color:#17373c}',
	'.agh-settings input[type="text"],.agh-settings input[type="password"],.agh-settings textarea,.agh-settings select{border-radius:12px;border-color:rgba(22,54,62,.16);box-shadow:none}',
	'.agh-settings .cbi-dropdown,.agh-settings .cbi-dropdown ul{z-index:60}',
	'@media(max-width:980px){.agh-actions{grid-template-columns:1fr}}'
].join('\n');

return view.extend({
	load: function() {
		return Promise.all([ uci.load('AdGuardHome'), callGetStatus(), callGetMeta() ]);
	},
	render: function(data) {
		var status = data[1] || {};
		var meta = data[2] || {};
		var linksText = meta.links || buildLinks(status.release_channel);
		var statusBox = E('div', { 'class': 'agh-status' }, t('Ready.', '就绪。'));
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

		var m = new form.Map('AdGuardHome', 'AdGuard Home', t('Core service options are kept in UCI; script-backed actions are exposed as cards above the form.', '核心服务选项继续保存在 UCI 中；脚本型动作集中放在表单上方的操作卡片中。'));
		var s = m.section(form.NamedSection, 'AdGuardHome', 'AdGuardHome', t('Base service settings', '基础服务设置'));
		s.addremove = false;
		s.anonymous = true;
		var o;
		o = s.option(form.Flag, 'enabled', t('Enable', '启用'));
		o = s.option(form.Flag, 'update', t('Check core update on startup', '启动时检查核心更新'));
		o = s.option(form.Value, 'httpport', t('Browser management port', '网页管理端口')); o.datatype = 'port'; o.placeholder = '3000';
		o = s.option(form.ListValue, 'redirect', t('DNS redirect mode', 'DNS 重定向模式')); o.value('none', t('None', '无')); o.value('dnsmasq-upstream', t('Use as dnsmasq upstream', '作为 dnsmasq 上游')); o.value('redirect', t('Redirect port 53', '重定向 53 端口')); o.value('exchange', t('Swap with dnsmasq port', '与 dnsmasq 交换端口'));
		o = s.option(form.Value, 'binpath', t('Core binary path', '核心文件路径')); o.placeholder = '/etc/config/adGuardConfig/AdGuardHome'; o.rmempty = false;
		o = s.option(form.ListValue, 'upxflag', t('UPX compression', 'UPX 压缩')); o.value('', t('Disabled', '禁用')); o.value('-1', t('Fast', '快速')); o.value('-9', t('Better', '更高压缩')); o.value('--best', t('Best', '最佳')); o.value('--brute', t('Brute force', '强力压缩')); o.rmempty = true;
		o = s.option(form.Value, 'configpath', t('YAML config path', 'YAML 配置路径')); o.placeholder = '/etc/config/adGuardConfig/AdGuardHome.yaml'; o.rmempty = false;
		o = s.option(form.Value, 'workdir', t('Work directory', '工作目录')); o.placeholder = '/etc/config/adGuardConfig/workspace'; o.rmempty = false;
		o = s.option(form.Value, 'logfile', t('Runtime log file', '运行日志文件')); o.placeholder = '/tmp/AdGuardHome.log'; o.rmempty = true;
		o = s.option(form.Flag, 'verbose', t('Verbose log', '详细日志'));
		o = s.option(form.Flag, 'gfw', t('Enable GFW upstream rules', '启用 GFW 上游规则'));
		o = s.option(form.Flag, 'gfwipset', t('Enable GFW ipset file', '启用 GFW ipset 文件'));
		o = s.option(form.Value, 'gfwupstream', t('GFW upstream DNS', 'GFW 上游 DNS')); o.placeholder = 'tcp://208.67.220.220:5353'; o.rmempty = true;
		o = s.option(form.Value, 'hashpass', t('Password bcrypt hash', '密码 bcrypt 哈希')); o.password = true; o.rmempty = true;
		o = s.option(form.MultiValue, 'upprotect', t('Keep files on system upgrade', '系统升级保留文件')); o.widget = 'checkbox'; o.value('$binpath', t('Core binary', '核心文件')); o.value('$configpath', t('Config file', '配置文件')); o.value('$logfile', t('Log file', '日志文件')); o.value('$workdir/data/sessions.db', 'sessions.db'); o.value('$workdir/data/stats.db', 'stats.db'); o.value('$workdir/data/querylog.json', 'querylog.json'); o.value('$workdir/data/filters', 'filters');
		o = s.option(form.Flag, 'waitonboot', t('Wait network then start', '等待网络后启动'));
		o = s.option(form.Flag, 'backup', t('Backup on shutdown', '停止服务时备份'));
		o = s.option(form.MultiValue, 'backupfile', t('Backup workdir files on shutdown', '关机备份工作目录文件')); o.widget = 'checkbox'; (meta.backup_choices || [ 'filters', 'stats.db', 'querylog.json', 'sessions.db' ]).forEach(function(item) { o.value(item, item); });
		o = s.option(form.Value, 'backupwdpath', t('Backup path', '备份路径')); o.placeholder = '/etc/config/adGuardConfig/workspace';
		o = s.option(form.MultiValue, 'crontab', t('Crontab tasks', '计划任务')); o.widget = 'checkbox'; o.value('autoupdate', t('Auto update core', '自动更新核心')); o.value('cutquerylog', t('Trim query log', '裁剪查询日志')); o.value('cutruntimelog', t('Trim runtime log', '裁剪运行日志')); o.value('autohost', t('Update IPv6 hosts', '更新 IPv6 hosts')); o.value('autogfw', t('Update GFW list', '更新 GFW 列表')); o.value('autogfwipset', t('Update GFW ipset', '更新 GFW ipset'));

		return m.render().then(function(formNode) {
			return E('div', { 'class': 'agh-settings' }, [
				E('style', {}, style),
				E('section', { 'class': 'agh-hero' }, [ E('h2', {}, t('AdGuard Home Settings', 'AdGuard Home 设置中心')), E('p', {}, t('A modern form and action console adapted from the fan app layout, with restrained cards that remain readable in Argon and stock LuCI themes.', '参考 fan app 布局重建的现代表单与操作控制台，卡片克制清晰，可适配 Argon 与默认 LuCI 主题。')) ]),
				E('section', { 'class': 'agh-actions' }, [ updateCard(statusBox), linksCard(channelSelect, archSelect, linksBox, statusBox), passwordCard(statusBox), gfwCard(statusBox) ]),
				formNode
			]);
		});
	}
});

function updateCard(statusBox) {
	return E('div', { 'class': 'agh-action' }, [
		E('h3', {}, t('Core Update', '核心更新')),
		E('p', {}, t('Trigger the updater through rpcd and follow progress on the Runtime Log page.', '通过 rpcd 触发更新，并到运行日志页面查看进度。')),
		E('div', { 'class': 'agh-row' }, [
			E('button', { 'class': 'btn cbi-button cbi-button-action', 'click': function() { callStartUpdate(false).then(function() { statusBox.textContent = t('Update scheduled.', '已调度更新。'); }); } }, t('Update', '更新')),
			E('button', { 'class': 'btn cbi-button cbi-button-negative', 'click': function() { callStartUpdate(true).then(function() { statusBox.textContent = t('Forced update scheduled.', '已调度强制更新。'); }); } }, t('Force update', '强制更新')),
			E('a', { 'class': 'btn cbi-button', 'href': L.url('admin', 'services', 'adguardhome', 'log') }, t('Open Log', '打开日志'))
		]), statusBox
	]);
}

function linksCard(channelSelect, archSelect, linksBox, statusBox) {
	return E('div', { 'class': 'agh-action' }, [
		E('h3', {}, t('Download Source', '下载源')),
		E('p', {}, t('Choose release channel and architecture; custom edits remain supported.', '选择发布通道和下载架构，也保留自定义地址能力。')),
		E('div', { 'class': 'agh-row' }, [ channelSelect, archSelect, E('button', { 'class': 'btn cbi-button cbi-button-action', 'click': function() { callSetLinks(linksBox.value, channelSelect.value, archSelect.value).then(function() { statusBox.textContent = t('Download source saved.', '下载源已保存。'); }); } }, t('Save source', '保存源')) ]),
		linksBox
	]);
}

function passwordCard(statusBox) {
	var input = E('input', { type: 'password', placeholder: t('New web password', '新的网页密码') });
	return E('div', { 'class': 'agh-action' }, [
		E('h3', {}, t('Password Helper', '密码助手')),
		E('p', {}, t('Generate bcrypt hash and paste it into the hash field below, then Save & Apply.', '生成 bcrypt 哈希并填入下方 hash 字段，然后保存并应用。')),
		E('div', { 'class': 'agh-row' }, [ input, E('button', { 'class': 'btn cbi-button', 'click': function() { ensureBcrypt().then(function() { var bcrypt = window.TwinBcrypt || (window.dcodeIO && window.dcodeIO.bcrypt); var hash = bcrypt && bcrypt.hashSync ? bcrypt.hashSync(input.value || '', 10) : ''; var target = document.querySelector('[data-name="hashpass"] input'); if (target && hash) target.value = hash; statusBox.textContent = hash ? t('Hash generated.', '哈希已生成。') : t('bcrypt library unavailable.', 'bcrypt 库不可用。'); }); } }, t('Generate hash', '生成哈希')) ])
	]);
}

function gfwCard(statusBox) {
	function run(action, label) { callGfwAction(action).then(function() { statusBox.textContent = label; }); }
	return E('div', { 'class': 'agh-action' }, [
		E('h3', {}, t('GFW Rules', 'GFW 规则')),
		E('p', {}, t('Keep legacy gfwlist and ipset workflows, exposed as compact action buttons.', '保留旧版 gfwlist 和 ipset 工作流，并改为紧凑操作按钮。')),
		E('div', { 'class': 'agh-row' }, [
			E('button', { 'class': 'btn cbi-button', 'click': function() { run('add', t('GFW list task started.', 'GFW 列表任务已启动。')); } }, t('Add list', '添加列表')),
			E('button', { 'class': 'btn cbi-button', 'click': function() { run('del', t('GFW list delete task started.', 'GFW 列表删除任务已启动。')); } }, t('Delete list', '删除列表')),
			E('button', { 'class': 'btn cbi-button', 'click': function() { run('ipset_add', t('GFW ipset task started.', 'GFW ipset 任务已启动。')); } }, t('Add ipset', '添加 ipset')),
			E('button', { 'class': 'btn cbi-button', 'click': function() { run('ipset_del', t('GFW ipset delete task started.', 'GFW ipset 删除任务已启动。')); } }, t('Delete ipset', '删除 ipset'))
		])
	]);
}
