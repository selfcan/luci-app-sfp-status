'use strict';
'require view';
'require poll';
'require rpc';

var callGetStatus = rpc.declare({
	object: 'luci.adguardhome',
	method: 'getStatus',
	expect: { '': {} }
});

var callGetLog = rpc.declare({
	object: 'luci.adguardhome',
	method: 'getLog',
	params: [ 'scope' ],
	expect: { '': {} }
});

var callClearLog = rpc.declare({
	object: 'luci.adguardhome',
	method: 'clearLog',
	params: [ 'scope' ],
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

function addStatusNotice(node, type, text) {
	node.className = 'adh-inline-status adh-inline-status-' + type;
	node.textContent = text;
}

var pageStyle = [
	'.adh-log-page { display:grid; gap:18px; }',
	'.adh-log-hero { position:relative; overflow:hidden; border-radius:24px; padding:26px; color:#f6f8f6; background:linear-gradient(135deg,#162f46 0%,#2a5b67 46%,#6a7140 100%); box-shadow:0 18px 38px rgba(14,30,37,.14); }',
	'.adh-log-hero:before { content:""; position:absolute; right:-70px; bottom:-70px; width:220px; height:220px; border-radius:50%; background:radial-gradient(circle, rgba(255,221,155,.24), rgba(255,221,155,0)); }',
	'.adh-log-hero h2 { position:relative; z-index:1; margin:0; font-size:31px; font-weight:700; color:#fff; }',
	'.adh-log-hero p { position:relative; z-index:1; margin:10px 0 0; max-width:62rem; line-height:1.75; color:rgba(246,248,246,.88); }',
	'.adh-log-chip-row { position:relative; z-index:1; display:flex; flex-wrap:wrap; gap:10px; margin-top:18px; }',
	'.adh-log-chip { display:inline-flex; align-items:center; padding:8px 13px; border-radius:999px; background:rgba(255,255,255,.13); border:1px solid rgba(255,255,255,.12); font-size:12px; color:#fff; }',
	'.adh-log-card { border-radius:22px; border:1px solid rgba(22,54,62,.10); background:linear-gradient(180deg,#fcfdfb,#f1f6f3); box-shadow:0 16px 34px rgba(18,46,52,.10); overflow:hidden; }',
	'.adh-log-toolbar { display:flex; flex-wrap:wrap; gap:10px; justify-content:space-between; align-items:center; padding:18px 20px; border-bottom:1px solid rgba(22,54,62,.08); }',
	'.adh-log-tab-row, .adh-log-action-row { display:flex; flex-wrap:wrap; gap:10px; align-items:center; }',
	'.adh-log-tab.is-active { background:#1b6c5d; color:#fff; border-color:#1b6c5d; }',
	'.adh-log-output { margin:20px; min-height:560px; padding:18px; border-radius:18px; background:#0f1a22; color:#d4e5dd; font:12px/1.7 Consolas, Monaco, monospace; white-space:pre-wrap; word-break:break-word; overflow:auto; }',
	'.adh-inline-status { margin:0 20px 20px; padding:12px 14px; border-radius:14px; font-size:13px; line-height:1.7; }',
	'.adh-inline-status-info { background:rgba(29,91,102,.08); color:#204d56; }',
	'.adh-inline-status-success { background:rgba(56,158,94,.10); color:#19643b; }',
	'.adh-inline-status-warning { background:rgba(214,149,39,.12); color:#8e5f11; }',
	'.adh-inline-status-error { background:rgba(209,73,91,.12); color:#8e2f3f; }'
].join('\n');

return view.extend({
	load: function() {
		return Promise.all([
			L.resolveDefault(callGetStatus(), {}),
			L.resolveDefault(callGetLog('runtime'), {}),
			L.resolveDefault(callGetLog('update'), {})
		]);
	},

	render: function(data) {
		var status = data[0] || {};
		var logs = {
			runtime: data[1] || {},
			update: data[2] || {}
		};
		var currentScope = 'runtime';
		var output = E('pre', { 'class': 'adh-log-output' }, logs.runtime.content || t('Runtime log is empty or not configured.', '运行日志为空，或者当前没有配置日志路径。'));
		var statusBox = E('div', { 'class': 'adh-inline-status adh-inline-status-info' }, t('This page polls the new rpcd backend for runtime and updater output.', '这个页面会轮询新的 rpcd 后端，分别显示运行日志和更新日志输出。'));
		var runtimeTab = E('button', { 'class': 'btn cbi-button adh-log-tab is-active' }, t('Runtime log', '运行日志'));
		var updateTab = E('button', { 'class': 'btn cbi-button adh-log-tab' }, t('Update log', '更新日志'));
		var refreshBtn = E('button', { 'class': 'btn cbi-button' }, t('Refresh now', '立即刷新'));
		var clearBtn = E('button', { 'class': 'btn cbi-button cbi-button-remove' }, t('Clear current log', '清空当前日志'));

		function renderContent(scope) {
			currentScope = scope;
			runtimeTab.classList.toggle('is-active', scope === 'runtime');
			updateTab.classList.toggle('is-active', scope === 'update');
			output.textContent = (logs[scope] && logs[scope].content) || (scope === 'runtime' ? t('Runtime log is empty or not configured.', '运行日志为空，或者当前没有配置日志路径。') : t('Update log is empty.', '更新日志为空。'));
			addStatusNotice(statusBox, 'info', scope === 'runtime' ? t('Showing current runtime log output.', '当前显示运行日志输出。') : t('Showing current updater output.', '当前显示更新脚本输出。'));
		}

		function refreshScope(scope) {
			return callGetLog(scope).then(function(nextLog) {
				logs[scope] = nextLog || {};
				if (scope === currentScope)
					renderContent(scope);
			});
		}

		runtimeTab.addEventListener('click', function(ev) {
			ev.preventDefault();
			renderContent('runtime');
		});

		updateTab.addEventListener('click', function(ev) {
			ev.preventDefault();
			renderContent('update');
		});

		refreshBtn.addEventListener('click', function(ev) {
			ev.preventDefault();
			refreshScope(currentScope).catch(function(err) {
				addStatusNotice(statusBox, 'error', t('Failed to refresh log output: ', '刷新日志输出失败：') + err.message);
			});
		});

		clearBtn.addEventListener('click', function(ev) {
			ev.preventDefault();
			callClearLog(currentScope).then(function() {
				logs[currentScope] = { content: '' };
				renderContent(currentScope);
				addStatusNotice(statusBox, 'success', currentScope === 'runtime' ? t('Runtime log has been cleared.', '运行日志已清空。') : t('Update log has been cleared.', '更新日志已清空。'));
			}).catch(function(err) {
				addStatusNotice(statusBox, 'error', t('Failed to clear log: ', '清理日志失败：') + err.message);
			});
		});

		poll.add(function() {
			return refreshScope(currentScope).catch(function(err) {
				addStatusNotice(statusBox, 'error', t('Failed to refresh log output: ', '刷新日志输出失败：') + err.message);
			});
		}, 3);

		return E('div', { 'class': 'adh-log-page' }, [
			E('style', {}, pageStyle),
			E('div', { 'class': 'adh-log-hero' }, [
				E('h2', {}, t('Runtime Log', '运行日志')),
				E('p', {}, t('Read the runtime log file or updater output through rpcd without going back to the legacy SimpleForm template. This page stays compatible with file logs and the generated syslog snapshot helper.', '通过 rpcd 读取运行日志文件或更新脚本输出，不再依赖旧版 SimpleForm 模板。这个页面同时兼容普通文件日志和 syslog 快照脚本。')),
				E('div', { 'class': 'adh-log-chip-row' }, [
					E('span', { 'class': 'adh-log-chip' }, status.running ? t('Service running', '服务运行中') : t('Service stopped', '服务未运行')),
					E('span', { 'class': 'adh-log-chip' }, status.update_running ? t('Updater active', '更新进程运行中') : t('Updater idle', '更新进程空闲')),
					E('span', { 'class': 'adh-log-chip' }, status.logfile ? t('Log target: ', '日志目标：') + status.logfile : t('No runtime logfile configured', '当前未配置运行日志文件'))
				])
			]),
			E('div', { 'class': 'adh-log-card' }, [
				E('div', { 'class': 'adh-log-toolbar' }, [
					E('div', { 'class': 'adh-log-tab-row' }, [ runtimeTab, updateTab ]),
					E('div', { 'class': 'adh-log-action-row' }, [ refreshBtn, clearBtn ])
				]),
				output,
				statusBox
			])
		]);
	}
});