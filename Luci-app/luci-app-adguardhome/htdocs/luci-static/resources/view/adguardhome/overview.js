'use strict';
'require view';
'require poll';
'require rpc';

var callGetStatus = rpc.declare({
	object: 'luci.adguardhome',
	method: 'getStatus',
	expect: { '': {} }
});

var pageStyle = [
	'.agh-overview { --agh-ink:#18224b; --agh-muted:#61708f; --agh-line:rgba(38,58,93,.12); --agh-panel:rgba(255,255,255,.82); --agh-blue:#5b6ee1; --agh-green:#1f9b62; --agh-red:#d84b63; display:grid; gap:18px; color:var(--agh-ink); }',
	'.agh-overview * { box-sizing:border-box; }',
	'.agh-head { display:grid; grid-template-columns:minmax(0,1fr) minmax(260px,320px); gap:18px; align-items:stretch; padding:20px; border-radius:20px; border:1px solid var(--agh-line); background:linear-gradient(135deg,#f7faf9 0%,#e9eef2 100%); box-shadow:0 18px 40px rgba(25,35,70,.08); overflow:hidden; }',
	'.agh-title-card { display:flex; flex-direction:column; justify-content:center; min-height:96px; padding:22px 24px; border-radius:18px; background:rgba(255,255,255,.88); border:1px solid rgba(255,255,255,.88); box-shadow:inset 0 1px 0 rgba(255,255,255,.9), 0 12px 26px rgba(26,42,76,.08); }',
	'.agh-title-card h2 { margin:0; font-size:2rem; line-height:1.15; font-weight:800; color:#151d4a; letter-spacing:0; }',
	'.agh-title-card p { margin:12px 0 0; max-width:760px; line-height:1.7; color:#425174; }',
	'.agh-badges { display:flex; flex-wrap:wrap; gap:10px; margin-top:18px; }',
	'.agh-badge { display:inline-flex; align-items:center; gap:8px; min-height:30px; padding:6px 12px; border-radius:999px; border:1px solid var(--agh-line); background:#fff; color:#34405f; font-size:13px; font-weight:700; }',
	'.agh-badge:before { content:""; width:8px; height:8px; flex:0 0 auto; border-radius:50%; background:#9aa6ba; }',
	'.agh-badge-ok { color:#12643d; border-color:rgba(31,155,98,.22); background:rgba(31,155,98,.10); }',
	'.agh-badge-ok:before { background:var(--agh-green); }',
	'.agh-badge-bad { color:#8f263a; border-color:rgba(216,75,99,.24); background:rgba(216,75,99,.11); }',
	'.agh-badge-bad:before { background:var(--agh-red); }',
	'.agh-side { display:grid; gap:10px; align-content:start; }',
	'.agh-core { padding:16px 18px; border-radius:16px; background:rgba(255,255,255,.72); border:1px solid rgba(255,255,255,.82); }',
	'.agh-label { font-size:12px; font-weight:800; color:#53617e; }',
	'.agh-value { margin-top:8px; font-size:1.28rem; line-height:1.25; font-weight:800; color:#121a46; word-break:break-word; }',
	'.agh-sub { margin-top:8px; font-size:12px; line-height:1.6; color:#65738e; word-break:break-word; }',
	'.agh-actions { display:grid; gap:9px; }',
	'.agh-actions .btn { display:flex; align-items:center; justify-content:center; min-height:40px; border-radius:10px; font-weight:700; }',
	'.agh-metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; }',
	'.agh-card { min-height:128px; padding:17px; border-radius:16px; border:1px solid var(--agh-line); background:var(--agh-panel); box-shadow:0 12px 30px rgba(25,35,70,.06); }',
	'.agh-card strong { display:block; margin-top:12px; font-size:1.24rem; line-height:1.2; color:#121a46; word-break:break-word; }',
	'.agh-card span { display:block; margin-top:10px; font-size:12px; line-height:1.65; color:#65738e; word-break:break-word; }',
	'.agh-card-ok { border-color:rgba(31,155,98,.20); }',
	'.agh-card-bad { border-color:rgba(216,75,99,.20); }',
	'.agh-note { padding:14px 16px; border-radius:14px; background:#edf2f5; color:#495875; line-height:1.7; border:1px solid rgba(38,58,93,.08); }',
	'@media screen and (max-width: 980px) { .agh-head { grid-template-columns:1fr; } .agh-metrics { grid-template-columns:repeat(2,minmax(0,1fr)); } }',
	'@media screen and (max-width: 560px) { .agh-head { padding:14px; border-radius:16px; } .agh-title-card { padding:18px; } .agh-title-card h2 { font-size:1.55rem; } .agh-metrics { grid-template-columns:1fr; } }'
].join('\n');

function safeStatus(value) {
	return (value && typeof value === 'object' && !Array.isArray(value)) ? value : {};
}

function badge(label, active) {
	return E('span', { 'class': 'agh-badge ' + (active ? 'agh-badge-ok' : 'agh-badge-bad') }, label);
}

function metric(label, value, detail, active) {
	return E('div', { 'class': 'agh-card ' + (active ? 'agh-card-ok' : 'agh-card-bad') }, [
		E('div', { 'class': 'agh-label' }, label),
		E('strong', {}, value),
		E('span', {}, detail)
	]);
}

return view.extend({
	load: function() {
		return Promise.all([
			L.resolveDefault(callGetStatus(), {})
		]);
	},

	renderShell: function(rawStatus) {
		var status = safeStatus(rawStatus);
		var consoleHref = status.httpport ? window.location.protocol + '//' + window.location.hostname + ':' + status.httpport + '/' : '#';
		var consoleAttrs = {
			'class': 'btn cbi-button cbi-button-action',
			'href': consoleHref,
			'target': '_blank',
			'rel': 'noreferrer noopener'
		};

		if (!status.httpport)
			consoleAttrs.style = 'pointer-events:none;opacity:.48';

		return E('div', { 'class': 'agh-overview' }, [
			E('style', {}, pageStyle),
			E('section', { 'class': 'agh-head' }, [
				E('div', { 'class': 'agh-title-card' }, [
					E('h2', {}, _('AdGuard Home')),
					E('p', {}, _('在 LuCI 中集中查看核心、服务、DNS 重定向、配置文件和工作目录状态。')),
					E('div', { 'class': 'agh-badges' }, [
						badge(status.running ? _('运行中') : _('未运行'), status.running),
						badge(status.redirect ? _('已重定向') : _('未重定向'), status.redirect),
						badge(status.core_ready ? _('核心已就绪') : _('核心缺失'), status.core_ready)
					])
				]),
				E('aside', { 'class': 'agh-side' }, [
					E('a', consoleAttrs, _('打开 Web 控制台')),
					E('div', { 'class': 'agh-core' }, [
						E('div', { 'class': 'agh-label' }, _('当前核心')),
						E('div', { 'class': 'agh-value' }, status.version || _('未知')),
						E('div', { 'class': 'agh-sub' }, status.binpath || '-')
					]),
					E('div', { 'class': 'agh-actions' }, [
						E('a', { 'class': 'btn cbi-button cbi-button-action', 'href': L.url('admin', 'services', 'adguardhome', 'settings') }, _('打开设置页')),
						E('a', { 'class': 'btn cbi-button', 'href': L.url('admin', 'services', 'adguardhome', 'yaml') }, _('打开 YAML 编辑器')),
						E('a', { 'class': 'btn cbi-button', 'href': L.url('admin', 'services', 'adguardhome', 'log') }, _('查看运行日志'))
					])
				])
			]),
			E('section', { 'class': 'agh-metrics' }, [
				metric(_('服务状态'), status.running ? _('运行中') : _('未运行'), (status.enabled ? _('已启用') : _('已禁用')) + ' / ' + (status.waitonboot ? _('等待网络') : _('立即启动')), status.running),
				metric(_('DNS 重定向'), status.redirect ? _('已开启') : _('未开启'), _('模式') + ': ' + (status.redirect_mode || '-') + ' / DNS: ' + (status.dns_port || '?'), !status.redirect || !!status.dns_port),
				metric(_('配置路径'), status.configpath || '-', status.config_ready ? _('配置文件存在') : _('配置文件缺失'), status.config_ready),
				metric(_('工作目录'), status.workdir || '-', status.workdir_ready ? _('工作目录可用') : _('工作目录缺失'), status.workdir_ready)
			]),
			E('div', { 'class': 'agh-note' }, status.config_dirty ? _('检测到待提交 YAML 临时配置。') : _('状态层已就绪，可继续使用设置页、YAML 编辑器和运行日志。'))
		]);
	},

	render: function(data) {
		var shell = this.renderShell(data && data[0]);

		poll.add(L.bind(function() {
			return callGetStatus().then(L.bind(function(nextStatus) {
				var nextShell = this.renderShell(nextStatus);

				if (shell.parentNode)
					shell.parentNode.replaceChild(nextShell, shell);

				shell = nextShell;
			}, this));
		}, this), 3);

		return shell;
	}
});