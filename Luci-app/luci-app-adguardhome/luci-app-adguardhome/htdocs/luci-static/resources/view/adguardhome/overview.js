'use strict';
'require view';
'require poll';
'require rpc';

var callGetStatus = rpc.declare({
	object: 'luci.adguardhome',
	method: 'getStatus',
	expect: { '': {} }
});

function escapeHtml(value) {
	return String(value == null ? '' : value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

return view.extend({
	load: function() {
		return Promise.all([
			L.resolveDefault(callGetStatus(), {})
		]);
	},

	renderBadge: function(label, active) {
		return E('span', {
			'style': 'display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:' +
				(active ? 'rgba(44,155,75,.14);color:#176534;border:1px solid rgba(44,155,75,.24)' : 'rgba(209,73,91,.14);color:#963143;border:1px solid rgba(209,73,91,.24)')
		}, [
			E('span', {
				'style': 'width:8px;height:8px;border-radius:50%;background:' + (active ? '#2c9b4b' : '#d1495b')
			}),
			label
		]);
	},

	renderShell: function(status) {
		var chips = E('div', { 'style': 'display:flex;flex-wrap:wrap;gap:10px;margin-top:14px' }, [
			this.renderBadge(status.running ? _('运行中') : _('未运行'), status.running),
			this.renderBadge(status.redirect ? _('已重定向') : _('未重定向'), status.redirect),
			this.renderBadge(status.core_ready ? _('核心已就绪') : _('核心缺失'), status.core_ready)
		]);
		var quickLinks = E('div', { 'style': 'display:grid;gap:10px' }, [
			E('a', {
				'class': 'btn cbi-button cbi-button-action',
				'href': L.url('admin', 'services', 'adguardhome', 'settings')
			}, _('打开设置页')),
			E('a', {
				'class': 'btn cbi-button',
				'href': L.url('admin', 'services', 'adguardhome', 'yaml')
			}, _('打开 YAML 编辑器')),
			E('a', {
				'class': 'btn cbi-button',
				'href': L.url('admin', 'services', 'adguardhome', 'log')
			}, _('查看运行日志'))
		]);

		return E('div', {
			'class': 'cbi-section',
			'style': 'padding:24px;border-radius:22px;border:1px solid rgba(56,107,113,.18);background:linear-gradient(135deg,rgba(12,54,84,.08),rgba(28,95,76,.05));box-shadow:0 18px 38px rgba(14,30,37,.08);overflow:hidden'
		}, [
			E('div', { 'style': 'display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap' }, [
				E('div', {}, [
					E('h2', { 'style': 'margin:0;font-size:1.55rem;font-weight:700' }, _('AdGuard Home')), 
					E('p', { 'style': 'margin:10px 0 0;max-width:760px;line-height:1.7;opacity:.86' }, _('新的 modern LuCI 入口已经接管到 rpcd 状态层。下一步的配置页、YAML 编辑器和日志页都会挂在这套结构上。')),
					chips
				]),
				E('div', { 'style': 'display:grid;gap:10px;min-width:260px' }, [
					E('a', {
						'class': 'btn cbi-button cbi-button-action',
						'href': status.httpport ? window.location.protocol + '//' + window.location.hostname + ':' + status.httpport + '/' : '#',
						'target': '_blank',
						'rel': 'noreferrer noopener',
						'style': status.httpport ? '' : 'pointer-events:none;opacity:.45'
					}, _('打开 Web 控制台')),
					E('div', { 'style': 'padding:14px 16px;border-radius:18px;background:rgba(255,255,255,.64);border:1px solid rgba(44,82,106,.10)' }, [
						E('div', { 'style': 'font-size:12px;font-weight:700;letter-spacing:.08em;opacity:.68;text-transform:uppercase' }, _('当前核心')),
						E('div', { 'style': 'margin-top:10px;font-size:1.24rem;font-weight:700;word-break:break-word' }, status.version || _('未知')),
						E('div', { 'style': 'margin-top:8px;font-size:12px;line-height:1.6;opacity:.76;word-break:break-word' }, status.binpath || '-')
					]),
					quickLinks
				])
			]),
			E('div', { 'style': 'display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:18px' }, [
				E('div', { 'style': 'padding:16px;border-radius:18px;background:rgba(255,255,255,.64);border:1px solid rgba(44,82,106,.10)' }, [
					E('div', { 'style': 'font-size:12px;font-weight:700;letter-spacing:.08em;opacity:.68;text-transform:uppercase' }, _('服务状态')),
					E('div', { 'style': 'margin-top:10px;font-size:1.24rem;font-weight:700' }, status.running ? _('运行中') : _('未运行')),
					E('div', { 'style': 'margin-top:8px;font-size:12px;line-height:1.6;opacity:.76' }, (status.enabled ? _('已启用') : _('已禁用')) + ' · ' + (status.waitonboot ? _('开机等待网络') : _('立即启动')))
				]),
				E('div', { 'style': 'padding:16px;border-radius:18px;background:rgba(255,255,255,.64);border:1px solid rgba(44,82,106,.10)' }, [
					E('div', { 'style': 'font-size:12px;font-weight:700;letter-spacing:.08em;opacity:.68;text-transform:uppercase' }, _('DNS 重定向')),
					E('div', { 'style': 'margin-top:10px;font-size:1.24rem;font-weight:700' }, status.redirect ? _('已开启') : _('未开启')),
					E('div', { 'style': 'margin-top:8px;font-size:12px;line-height:1.6;opacity:.76' }, _('模式') + ': ' + (status.redirect_mode || '-') + ' · DNS: ' + (status.dns_port || '?'))
				]),
				E('div', { 'style': 'padding:16px;border-radius:18px;background:rgba(255,255,255,.64);border:1px solid rgba(44,82,106,.10)' }, [
					E('div', { 'style': 'font-size:12px;font-weight:700;letter-spacing:.08em;opacity:.68;text-transform:uppercase' }, _('配置路径')),
					E('div', { 'style': 'margin-top:10px;font-size:1.02rem;font-weight:700;word-break:break-word' }, status.configpath || '-'),
					E('div', { 'style': 'margin-top:8px;font-size:12px;line-height:1.6;opacity:.76' }, status.config_ready ? _('配置文件存在') : _('配置文件缺失'))
				]),
				E('div', { 'style': 'padding:16px;border-radius:18px;background:rgba(255,255,255,.64);border:1px solid rgba(44,82,106,.10)' }, [
					E('div', { 'style': 'font-size:12px;font-weight:700;letter-spacing:.08em;opacity:.68;text-transform:uppercase' }, _('工作目录')),
					E('div', { 'style': 'margin-top:10px;font-size:1.02rem;font-weight:700;word-break:break-word' }, status.workdir || '-'),
					E('div', { 'style': 'margin-top:8px;font-size:12px;line-height:1.6;opacity:.76' }, status.workdir_ready ? _('工作目录可用') : _('工作目录缺失'))
				])
			]),
			E('div', { 'style': 'margin-top:14px;padding:14px 16px;border-radius:16px;background:rgba(17,41,54,.06);line-height:1.7' }, E('span', { 'innerHTML': escapeHtml(status.config_dirty ? _('检测到待提交 YAML 临时配置。') : _('新 rpcd 状态层已就绪，可以继续挂接 modern 配置页、YAML 编辑页和日志页。')) }))
		]);
	},

	render: function(data) {
		var status = data[0] || {};
		var shell = this.renderShell(status);

		poll.add(L.bind(function() {
			return callGetStatus().then(L.bind(function(nextStatus) {
				var nextShell = this.renderShell(nextStatus || {});
				shell.parentNode.replaceChild(nextShell, shell);
				shell = nextShell;
			}, this));
		}, this), 3);

		return shell;
	}
});