'use strict';
'require view';
'require rpc';
'require poll';

var callGetStatus = rpc.declare({ object: 'luci.adguardhome', method: 'getStatus', expect: { '': {} } });

function hasChineseLocale() {
	var htmlLang = document.documentElement ? (document.documentElement.lang || '') : '';
	var bodyClass = document.body ? (document.body.className || '') : '';
	return /^zh(?:-|_|$)/i.test(htmlLang) || /\blang_zh(?:[-_][^\s]+)?\b/i.test(bodyClass);
}

function t(message, fallback) {
	var translated = _(message);
	return translated !== message || !fallback || !hasChineseLocale() ? translated : fallback;
}

function actionError(err, fallback) {
	var message = err && (err.message || err.toString && err.toString()) || '';
	if (/Object not found/i.test(message))
		return t('The luci.adguardhome rpcd object is not available. Reinstall this package or restart rpcd, then refresh LuCI.', '当前设备没有导出 luci.adguardhome rpcd 后端对象。请重新安装当前软件包或重启 rpcd，然后刷新 LuCI。');
	if (/Method not found/i.test(message))
		return t('The rpcd backend is outdated and does not provide this view data. Reinstall this package or restart rpcd, then refresh LuCI.', '当前设备上的 rpcd 后端版本过旧，未提供此页面所需数据。请重新安装当前软件包或重启 rpcd，然后刷新 LuCI。');
	return fallback + (message ? ': ' + message : '');
}

function safeCall(promise, fallback) {
	return promise.catch(function(err) {
		return Object.assign({ _rpc_error: err }, fallback || {});
	});
}

function yes(value) {
	return value === true || value === 1 || value === '1';
}

function text(value, fallback) {
	value = value == null ? '' : String(value);
	return value || fallback || '-';
}

function controlPanelUrl(status) {
	var port = parseInt(status && status.httpport, 10);
	var host = window.location.hostname || '127.0.0.1';
	if (host.indexOf(':') >= 0 && host.charAt(0) !== '[')
		host = '[' + host + ']';
	if (!(port > 0 && port < 65536))
		port = 3000;
	return 'http://' + host + ':' + port + '/';
}

var style = [
	'.agh-page{display:grid;gap:18px;color:#203042}',
	'.agh-shell{position:relative;overflow:hidden;border-radius:24px;background:linear-gradient(135deg,#143f46 0%,#1f6a5d 52%,#7d6828 100%);box-shadow:0 20px 42px rgba(15,38,48,.16)}',
	'.agh-shell:before{content:"";position:absolute;right:-90px;top:-100px;width:300px;height:300px;border-radius:999px;background:radial-gradient(circle,rgba(144,239,204,.24),rgba(144,239,204,0) 70%)}',
	'.agh-shell:after{content:"";position:absolute;left:-110px;bottom:-140px;width:340px;height:340px;border-radius:999px;background:radial-gradient(circle,rgba(255,212,122,.22),rgba(255,212,122,0) 70%)}',
	'.agh-hero{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(260px,.75fr);gap:18px;padding:26px;color:#f7fbf8}',
	'.agh-eyebrow{display:inline-flex;align-items:center;width:max-content;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.13);font-size:12px;letter-spacing:.08em;text-transform:uppercase}',
	'.agh-title{all:unset;display:block!important;margin:14px 0 10px!important;font-size:30px!important;line-height:1.16!important;font-weight:700!important;color:#fff!important;background:transparent!important;border:0!important;box-shadow:none!important}',
	'.agh-copy{max-width:68rem;margin:0;color:rgba(247,251,248,.86);font-size:14px;line-height:1.75}',
	'.agh-quick{display:grid;gap:10px;align-content:start}',
	'.agh-button-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}',
	'.agh-button-row .btn{border-radius:12px}',
	'.agh-panel-btn{background:rgba(255,255,255,.94)!important;color:#17373c!important;border-color:transparent!important;box-shadow:0 10px 22px rgba(18,39,47,.14)}',
	'.agh-chip{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.13);color:#fff}',
	'.agh-chip span{color:rgba(247,251,248,.72);font-size:12px}.agh-chip strong{font-size:15px}',
	'.agh-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}',
	'.agh-card{padding:18px;border-radius:20px;background:#fff;border:1px solid rgba(22,54,62,.1);box-shadow:0 12px 30px rgba(17,48,54,.08)}',
	'.agh-label{font-size:12px;line-height:1.5;color:#667084}.agh-value{margin-top:10px;font-size:24px;line-height:1.15;font-weight:700;color:#17373c;word-break:break-word}',
	'.agh-ok{color:#1c8b58}.agh-warn{color:#b27716}.agh-bad{color:#c94d5c}',
	'.agh-alert{padding:16px 18px;border-radius:18px;background:#fff4df;border:1px solid rgba(178,119,22,.2);color:#805718;box-shadow:0 10px 26px rgba(178,119,22,.08);line-height:1.7}',
	'.agh-paths{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.agh-path{padding:14px;border-radius:16px;background:#f7faf9;border:1px solid rgba(22,54,62,.08);min-width:0}.agh-path span{display:block;font-size:12px;color:#667084}.agh-path code{display:block;margin-top:8px;white-space:normal;word-break:break-all;color:#17373c}',
	'@media(max-width:1080px){.agh-hero,.agh-grid,.agh-paths{grid-template-columns:1fr 1fr}.agh-quick{grid-column:1/-1}}',
	'@media(max-width:720px){.agh-hero,.agh-grid,.agh-paths{grid-template-columns:1fr}.agh-hero{padding:20px}.agh-title{font-size:24px!important}}'
].join('\n');

return view.extend({
	load: function() {
		return safeCall(callGetStatus(), {});
	},
	render: function(status) {
		var root = E('div', { 'class': 'agh-page' });
		var rpcError = status._rpc_error;
		var state = yes(status.running) ? t('Running', '运行中') : t('Stopped', '未运行');
		var stateClass = yes(status.running) ? 'agh-ok' : 'agh-bad';

		root.appendChild(E('style', {}, style));
		if (rpcError)
			root.appendChild(E('section', { 'class': 'agh-alert' }, actionError(rpcError, t('Overview data unavailable', '概览数据不可用'))));
		root.appendChild(E('section', { 'class': 'agh-shell' }, E('div', { 'class': 'agh-hero' }, [
			E('div', {}, [
				E('span', { 'class': 'agh-eyebrow' }, t('Network DNS Guard', '网络 DNS 防护')),
				E('h2', { 'class': 'agh-title' }, 'AdGuard Home'),
				E('p', { 'class': 'agh-copy' }, t('Modern LuCI dashboard for service state, DNS redirect, core update readiness, YAML configuration and runtime logs. Designed for OpenWrt 24.10/25.12 and Argon theme.', '面向 OpenWrt 24.10/25.12 与 Argon 主题重新构建的现代 LuCI 控制台，集中展示服务状态、DNS 重定向、核心更新、YAML 配置和运行日志。')),
				E('div', { 'class': 'agh-button-row' }, [
					E('a', { 'class': 'btn cbi-button cbi-button-action', 'href': L.url('admin', 'services', 'adguardhome', 'settings') }, t('Open Settings', '打开设置')),
					E('a', { 'class': 'btn cbi-button agh-panel-btn', 'href': controlPanelUrl(status), 'target': '_blank', 'rel': 'noopener noreferrer' }, t('Control Panel', '控制面板')),
					E('a', { 'class': 'btn cbi-button', 'href': L.url('admin', 'services', 'adguardhome', 'yaml') }, t('Edit YAML', '编辑 YAML')),
					E('a', { 'class': 'btn cbi-button', 'href': L.url('admin', 'services', 'adguardhome', 'log') }, t('View Logs', '查看日志'))
				])
			]),
			E('div', { 'class': 'agh-quick' }, [
				E('div', { 'class': 'agh-chip' }, [ E('span', {}, t('Service', '服务')), E('strong', { 'class': rpcError ? 'agh-bad' : stateClass }, rpcError ? t('Backend missing', '后端缺失') : state) ]),
				E('div', { 'class': 'agh-chip' }, [ E('span', {}, t('Core', '核心')), E('strong', { 'class': yes(status.core_ready) ? 'agh-ok' : 'agh-warn' }, yes(status.core_ready) ? text(status.version) : t('Missing', '缺失')) ]),
				E('div', { 'class': 'agh-chip' }, [ E('span', {}, t('DNS Port', 'DNS 端口')), E('strong', {}, text(status.dns_port, rpcError ? '?' : '-')) ]),
				E('div', { 'class': 'agh-chip' }, [ E('span', {}, t('Redirect', '重定向')), E('strong', { 'class': yes(status.redirected) ? 'agh-ok' : '' }, yes(status.redirected) ? t('Active', '已启用') : text(status.redirect, 'none')) ])
			])
		])));

		root.appendChild(E('section', { 'class': 'agh-grid' }, [
			card(t('Web Console', 'Web 控制台'), text(status.httpport, '3000'), 'agh-ok'),
			card(t('Config File', '配置文件'), yes(status.config_ready) ? t('Ready', '就绪') : t('Missing', '缺失'), yes(status.config_ready) ? 'agh-ok' : 'agh-warn'),
			card(t('Workspace', '工作区'), yes(status.workdir_ready) ? t('Ready', '就绪') : t('Missing', '缺失'), yes(status.workdir_ready) ? 'agh-ok' : 'agh-warn'),
			card(t('Update Task', '更新任务'), yes(status.update_running) ? t('Running', '运行中') : t('Idle', '空闲'), yes(status.update_running) ? 'agh-warn' : 'agh-ok')
		]));

		root.appendChild(E('section', { 'class': 'agh-card' }, [
			E('div', { 'class': 'agh-paths' }, [
				pathItem(t('Core Binary', '核心文件'), status.binpath),
				pathItem(t('YAML Config', 'YAML 配置'), status.configpath),
				pathItem(t('Work Directory', '工作目录'), status.workdir)
			])
		]));

		return root;
	}
});

function card(label, value, cls) {
	return E('div', { 'class': 'agh-card' }, [ E('div', { 'class': 'agh-label' }, label), E('div', { 'class': 'agh-value ' + (cls || '') }, value) ]);
}

function pathItem(label, value) {
	return E('div', { 'class': 'agh-path' }, [ E('span', {}, label), E('code', {}, text(value, '-')) ]);
}
