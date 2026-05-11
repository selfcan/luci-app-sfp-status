'use strict';
'require view';
'require rpc';
'require poll';

var callGetLog = rpc.declare({ object: 'luci.adguardhome', method: 'getLog', params: [ 'scope', 'position' ], expect: { '': {} } });
var callClearLog = rpc.declare({ object: 'luci.adguardhome', method: 'clearLog', params: [ 'scope' ], expect: { '': {} } });

function hasChineseLocale() {
	var htmlLang = document.documentElement ? (document.documentElement.lang || '') : '';
	var bodyClass = document.body ? (document.body.className || '') : '';
	return /^zh(?:-|_|$)/i.test(htmlLang) || /\blang_zh(?:[-_][^\s]+)?\b/i.test(bodyClass);
}

function t(message, fallback) {
	var translated = _(message);
	return translated !== message || !fallback || !hasChineseLocale() ? translated : fallback;
}

var style = [
	'.agh-log{display:grid;gap:18px;color:#203042}',
	'.agh-hero{border-radius:24px;padding:26px;color:#f7fbf8;background:linear-gradient(135deg,#143f46 0%,#1f6a5d 52%,#7d6828 100%);box-shadow:0 20px 42px rgba(15,38,48,.16)}',
	'.agh-hero h2{all:unset;display:block!important;margin:0 0 10px!important;font-size:28px!important;line-height:1.18!important;font-weight:700!important;color:#fff!important;background:transparent!important;border:0!important;box-shadow:none!important}',
	'.agh-hero p{max-width:72rem;margin:0;color:rgba(247,251,248,.86);font-size:14px;line-height:1.75}',
	'.agh-card{border-radius:22px;background:#fff;border:1px solid rgba(22,54,62,.1);box-shadow:0 12px 30px rgba(17,48,54,.08);overflow:hidden}',
	'.agh-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:16px 18px;border-bottom:1px solid rgba(22,54,62,.08);background:#f7faf9}.agh-toolbar .btn{border-radius:12px}',
	'.agh-tabs{display:inline-flex;gap:6px;padding:4px;border-radius:14px;background:#eaf1ef}.agh-tab{border:0;border-radius:10px;padding:8px 13px;background:transparent;color:#51606f;cursor:pointer}.agh-tab.active{background:#fff;color:#17373c;box-shadow:0 3px 12px rgba(17,48,54,.09)}',
	'.agh-console{margin:0;min-height:560px;max-height:72vh;overflow:auto;padding:18px;background:#101719;color:#d8f0e3;font-family:ui-monospace,SFMono-Regular,Consolas,Monaco,monospace;font-size:12px;line-height:1.65;white-space:pre-wrap;word-break:break-word}',
	'.agh-status{padding:12px 18px;border-top:1px solid rgba(22,54,62,.08);background:#f7faf9;color:#51606f;font-size:12px;line-height:1.55}',
	'@media(max-width:720px){.agh-hero{padding:20px}.agh-hero h2{font-size:24px!important}.agh-console{min-height:480px}}'
].join('\n');

return view.extend({
	load: function() {
		return callGetLog('runtime', 0);
	},
	render: function(data) {
		var scope = 'runtime';
		var positions = { runtime: Number(data.position || 0), update: 0 };
		var output = E('pre', { 'class': 'agh-console' }, data.content || '');
		var status = E('div', { 'class': 'agh-status' }, t('Runtime log loaded.', '运行日志已加载。'));
		var runtimeTab = E('button', { 'class': 'agh-tab active' }, t('Runtime', '运行日志'));
		var updateTab = E('button', { 'class': 'agh-tab' }, t('Update', '更新日志'));

		function appendLog(res, reset) {
			positions[scope] = Number(res.position || positions[scope] || 0);
			if (reset)
				output.textContent = res.content || '';
			else if (res.content)
				output.textContent += res.content;
			status.textContent = t('Size', '大小') + ': ' + (res.size || 0) + ' B' + (res.running ? ' · ' + t('Task running', '任务运行中') : '');
			output.scrollTop = output.scrollHeight;
		}

		function loadScope(nextScope) {
			scope = nextScope;
			runtimeTab.classList.toggle('active', scope === 'runtime');
			updateTab.classList.toggle('active', scope === 'update');
			positions[scope] = 0;
			return callGetLog(scope, 0).then(function(res) { appendLog(res, true); });
		}

		runtimeTab.addEventListener('click', function() { loadScope('runtime'); });
		updateTab.addEventListener('click', function() { loadScope('update'); });

		poll.add(function() {
			return callGetLog(scope, positions[scope] || 0).then(function(res) { appendLog(res, false); });
		}, 3);

		return E('div', { 'class': 'agh-log' }, [
			E('style', {}, style),
			E('section', { 'class': 'agh-hero' }, [ E('h2', {}, t('Runtime Logs', '运行日志')), E('p', {}, t('Follow service and core update output from one responsive console.', '在一个响应式控制台里查看服务运行日志和核心更新日志。')) ]),
			E('section', { 'class': 'agh-card' }, [
				E('div', { 'class': 'agh-toolbar' }, [
					E('div', { 'class': 'agh-tabs' }, [ runtimeTab, updateTab ]),
					E('button', { 'class': 'btn cbi-button', 'click': function() { positions[scope] = 0; callGetLog(scope, 0).then(function(res) { appendLog(res, true); }); } }, t('Reload', '重新载入')),
					E('button', { 'class': 'btn cbi-button cbi-button-negative', 'click': function() { callClearLog(scope).then(function() { positions[scope] = 0; output.textContent = ''; status.textContent = t('Log cleared.', '日志已清空。'); }); } }, t('Clear', '清空'))
				]),
				output,
				status
			])
		]);
	}
});
