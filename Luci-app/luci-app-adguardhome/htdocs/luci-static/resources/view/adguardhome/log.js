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

function actionError(err, fallback) {
	var message = err && (err.message || err.toString && err.toString()) || '';
	if (/Object not found/i.test(message))
		return t('The luci.adguardhome rpcd object is not available. Reinstall this package or restart rpcd, then refresh LuCI.', '当前设备没有导出 luci.adguardhome rpcd 后端对象。请重新安装当前软件包或重启 rpcd，然后刷新 LuCI。');
	if (/Method not found/i.test(message))
		return t('The rpcd backend is outdated and does not provide log actions. Reinstall this package or restart rpcd, then refresh LuCI.', '当前设备上的 rpcd 后端版本过旧，未提供日志相关操作。请重新安装当前软件包或重启 rpcd，然后刷新 LuCI。');
	return fallback + (message ? ': ' + message : '');
}

function safeCall(promise, fallback) {
	return promise.catch(function(err) {
		return Object.assign({ _rpc_error: err }, fallback || {});
	});
}


function normalizeLogContent(content) {
	return String(content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function createTerminalState() {
	return { committed: '', line: '' };
}

function renderTerminalContent(state, content, reset) {
	var source = String(content || '');
	var committed = reset ? '' : state.committed;
	var line = reset ? '' : state.line;
	var index;

	for (index = 0; index < source.length; index++) {
		var chr = source.charAt(index);
		var next = source.charAt(index + 1);

		if (chr === '\r') {
			if (next === '\n')
				continue;
			line = '';
			continue;
		}

		if (chr === '\n') {
			committed += line + '\n';
			line = '';
			continue;
		}

		line += chr;
	}

	state.committed = committed;
	state.line = line;

	return committed + line;
}

var style = [
	'.agh-log{display:grid;gap:18px;color:#203042}',
	'.agh-hero{border-radius:24px;padding:26px;color:#f7fbf8;background:linear-gradient(135deg,#143f46 0%,#1f6a5d 52%,#7d6828 100%);box-shadow:0 20px 42px rgba(15,38,48,.16)}',
	'.agh-hero h2{all:unset;display:block!important;margin:0 0 10px!important;font-size:28px!important;line-height:1.18!important;font-weight:700!important;color:#fff!important;background:transparent!important;border:0!important;box-shadow:none!important}',
	'.agh-hero p{max-width:72rem;margin:0;color:rgba(247,251,248,.86);font-size:14px;line-height:1.75}',
	'.agh-card{border-radius:22px;background:#fff;border:1px solid rgba(22,54,62,.1);box-shadow:0 12px 30px rgba(17,48,54,.08);overflow:hidden}',
	'.agh-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:16px 18px;border-bottom:1px solid rgba(22,54,62,.08);background:#f7faf9}.agh-toolbar .btn{border-radius:12px}',
	'.agh-toolbar .btn[disabled]{opacity:.6;cursor:not-allowed}',
	'.agh-tabs{display:inline-flex;gap:6px;padding:4px;border-radius:14px;background:#eaf1ef}.agh-tab{border:0;border-radius:10px;padding:8px 13px;background:transparent;color:#51606f;cursor:pointer}.agh-tab.active{background:#fff;color:#17373c;box-shadow:0 3px 12px rgba(17,48,54,.09)}',
	'.agh-console{margin:0;min-height:560px;max-height:72vh;overflow:auto;padding:18px;background:#101719;color:#d8f0e3;font-family:ui-monospace,SFMono-Regular,Consolas,Monaco,monospace;font-size:12px;line-height:1.65;white-space:pre-wrap;word-break:break-word}',
	'.agh-status{padding:12px 18px;border-top:1px solid rgba(22,54,62,.08);background:#f7faf9;color:#51606f;font-size:12px;line-height:1.55}',
	'.agh-alert{padding:16px 18px;border-bottom:1px solid rgba(22,54,62,.08);background:#fff4df;color:#805718;line-height:1.7}',
	'@media(max-width:720px){.agh-hero{padding:20px}.agh-hero h2{font-size:24px!important}.agh-console{min-height:480px}}'
].join('\n');

return view.extend({
	load: function() {
		return Promise.resolve({ scope: 'runtime', position: 0, content: '', size: 0, running: false });
	},
	render: function(data) {
		var scope = 'runtime';
		var rpcError = data._rpc_error;
		var positions = { runtime: Number(data.position || 0), update: 0 };
		var terminalStates = { runtime: createTerminalState(), update: createTerminalState() };
		var output = E('pre', { 'class': 'agh-console' }, rpcError ? actionError(rpcError, t('Log backend unavailable', '日志后端不可用')) : t('Loading current log…', '正在载入当前日志…'));
		var status = E('div', { 'class': 'agh-status' }, rpcError ? actionError(rpcError, t('Log backend unavailable', '日志后端不可用')) : t('Loading runtime log…', '正在载入运行日志…'));
		var runtimeTab = E('button', { 'class': 'agh-tab active', 'disabled': rpcError ? 'disabled' : null }, t('Runtime', '运行日志'));
		var updateTab = E('button', { 'class': 'agh-tab', 'disabled': rpcError ? 'disabled' : null }, t('Update', '更新日志'));
		var reloadButton = E('button', { 'class': 'btn cbi-button', 'disabled': rpcError ? 'disabled' : null }, t('Reload', '重新载入'));
		var clearButton = E('button', { 'class': 'btn cbi-button cbi-button-negative', 'disabled': rpcError ? 'disabled' : null }, t('Clear', '清空'));

		function appendLog(res, reset) {
			positions[scope] = Number(res.position || positions[scope] || 0);

			if (scope === 'update') {
				output.textContent = renderTerminalContent(terminalStates.update, res.content, reset);
			}
			else {
				var content = normalizeLogContent(res.content);
				if (reset)
					output.textContent = content;
				else if (content)
					output.textContent += content;
			}

			status.textContent = t('Size', '大小') + ': ' + (res.size || 0) + ' B' + (res.running ? ' · ' + t('Task running', '任务运行中') : '');
			output.scrollTop = output.scrollHeight;
		}

		function loadScope(nextScope) {
			scope = nextScope;
			runtimeTab.classList.toggle('active', scope === 'runtime');
			updateTab.classList.toggle('active', scope === 'update');
			positions[scope] = 0;
			terminalStates[scope] = createTerminalState();
			output.textContent = t('Loading current log…', '正在载入当前日志…');
			status.textContent = scope === 'update'
				? t('Loading update log…', '正在载入更新日志…')
				: t('Loading runtime log…', '正在载入运行日志…');
			return callGetLog(scope, 0).then(function(res) {
				appendLog(res, true);
			}).catch(function(err) {
				output.textContent = '';
				status.textContent = actionError(err, t('Loading log failed', '载入日志失败'));
			});
		}

		runtimeTab.addEventListener('click', function() { loadScope('runtime'); });
		updateTab.addEventListener('click', function() { loadScope('update'); });
		reloadButton.addEventListener('click', function() {
			positions[scope] = 0;
			callGetLog(scope, 0).then(function(res) {
				appendLog(res, true);
			}).catch(function(err) {
				status.textContent = actionError(err, t('Reloading log failed', '重新载入日志失败'));
			});
		});
		clearButton.addEventListener('click', function() {
			callClearLog(scope).then(function() {
				positions[scope] = 0;
				terminalStates[scope] = createTerminalState();
				output.textContent = '';
				status.textContent = t('Log cleared.', '日志已清空。');
			}).catch(function(err) {
				status.textContent = actionError(err, t('Clearing log failed', '清空日志失败'));
			});
		});

		if (!rpcError) {
			loadScope('runtime');
			poll.add(function() {
				return callGetLog(scope, positions[scope] || 0).then(function(res) {
					appendLog(res, false);
				}).catch(function(err) {
					status.textContent = actionError(err, t('Polling log failed', '轮询日志失败'));
				});
			}, 3);
		}

		return E('div', { 'class': 'agh-log' }, [
			E('style', {}, style),
			E('section', { 'class': 'agh-hero' }, [ E('h2', {}, t('Runtime Logs', '运行日志')), E('p', {}, t('Follow service and core update output from one responsive console.', '在一个响应式控制台里查看服务运行日志和核心更新日志。')) ]),
			E('section', { 'class': 'agh-card' }, [
				rpcError ? E('div', { 'class': 'agh-alert' }, actionError(rpcError, t('Log backend unavailable', '日志后端不可用'))) : '',
				E('div', { 'class': 'agh-toolbar' }, [
					E('div', { 'class': 'agh-tabs' }, [ runtimeTab, updateTab ]),
					reloadButton,
					clearButton
				]),
				output,
				status
			])
		]);
	}
});
