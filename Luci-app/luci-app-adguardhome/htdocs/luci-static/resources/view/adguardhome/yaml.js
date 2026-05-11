'use strict';
'require view';
'require rpc';

var callGetYaml = rpc.declare({ object: 'luci.adguardhome', method: 'getYaml', expect: { '': {} } });
var callGetTemplate = rpc.declare({ object: 'luci.adguardhome', method: 'getTemplateConfig', expect: { '': {} } });
var callSaveYaml = rpc.declare({ object: 'luci.adguardhome', method: 'saveYaml', params: [ 'content' ], expect: { '': {} } });
var callDiscardYaml = rpc.declare({ object: 'luci.adguardhome', method: 'discardYaml', expect: { '': {} } });

function hasChineseLocale() {
	var htmlLang = document.documentElement ? (document.documentElement.lang || '') : '';
	var bodyClass = document.body ? (document.body.className || '') : '';
	return /^zh(?:-|_|$)/i.test(htmlLang) || /\blang_zh(?:[-_][^\s]+)?\b/i.test(bodyClass);
}

function t(message, fallback) {
	var translated = _(message);
	return translated !== message || !fallback || !hasChineseLocale() ? translated : fallback;
}

function ensureStyle(src, id) {
	if (document.getElementById(id))
		return;
	var link = document.createElement('link');
	link.id = id;
	link.rel = 'stylesheet';
	link.href = src;
	document.head.appendChild(link);
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

function ensureCodeMirror() {
	ensureStyle(L.resource('codemirror/lib/codemirror.css'), 'agh-cm-base');
	ensureStyle(L.resource('codemirror/theme/dracula.css'), 'agh-cm-theme');
	return ensureScript(L.resource('codemirror/lib/codemirror.js'), 'agh-cm-script').then(function() {
		return ensureScript(L.resource('codemirror/mode/yaml/yaml.js'), 'agh-cm-yaml');
	});
}

var style = [
	'.agh-yaml{display:grid;gap:18px;color:#203042}',
	'.agh-hero{border-radius:24px;padding:26px;color:#f7fbf8;background:linear-gradient(135deg,#143f46 0%,#1f6a5d 52%,#7d6828 100%);box-shadow:0 20px 42px rgba(15,38,48,.16)}',
	'.agh-hero h2{all:unset;display:block!important;margin:0 0 10px!important;font-size:28px!important;line-height:1.18!important;font-weight:700!important;color:#fff!important;background:transparent!important;border:0!important;box-shadow:none!important}',
	'.agh-hero p{max-width:72rem;margin:0;color:rgba(247,251,248,.86);font-size:14px;line-height:1.75}',
	'.agh-card{border-radius:22px;background:#fff;border:1px solid rgba(22,54,62,.1);box-shadow:0 12px 30px rgba(17,48,54,.08);overflow:hidden}',
	'.agh-toolbar{display:flex;gap:10px;flex-wrap:wrap;padding:16px 18px;border-bottom:1px solid rgba(22,54,62,.08);background:#f7faf9}.agh-toolbar .btn{border-radius:12px}',
	'.agh-editor{padding:0}.agh-editor textarea{width:100%;min-height:620px;border:0;border-radius:0;font-family:monospace;font-size:13px;box-sizing:border-box}',
	'.CodeMirror{height:auto;min-height:620px;font-size:13px;line-height:1.65}.CodeMirror-scroll{min-height:620px}',
	'.agh-status{padding:12px 18px;border-top:1px solid rgba(22,54,62,.08);background:#f7faf9;color:#51606f;font-size:12px;line-height:1.55;white-space:pre-wrap}',
	'@media(max-width:720px){.agh-hero{padding:20px}.agh-hero h2{font-size:24px!important}.CodeMirror,.CodeMirror-scroll,.agh-editor textarea{min-height:520px}}'
].join('\n');

return view.extend({
	load: function() {
		return callGetYaml();
	},
	render: function(data) {
		var textarea = E('textarea', {}, data.content || '');
		var statusBox = E('div', { 'class': 'agh-status' }, data.test_log || t('Ready.', '就绪。'));
		var editor = null;

		function value() { return editor ? editor.getValue() : textarea.value; }
		function setValue(content) { editor ? editor.setValue(content || '') : textarea.value = content || ''; }
		function setStatus(message) { statusBox.textContent = message; }

		var node = E('div', { 'class': 'agh-yaml' }, [
			E('style', {}, style),
			E('section', { 'class': 'agh-hero' }, [ E('h2', {}, t('YAML Editor', 'YAML 编辑器')), E('p', {}, t('Edit the file-backed AdGuard Home YAML configuration with template generation, validation and apply through rpcd.', '通过 rpcd 编辑文件型 AdGuard Home YAML 配置，支持模板生成、校验和应用。')) ]),
			E('section', { 'class': 'agh-card' }, [
				E('div', { 'class': 'agh-toolbar' }, [
					E('button', { 'class': 'btn cbi-button cbi-button-action', 'click': function() { callSaveYaml(value()).then(function(res) { setStatus(res.ok ? t('YAML saved and service reload scheduled.', 'YAML 已保存，并已调度服务重载。') : (res.error || t('Validation failed.', '校验失败。'))); }); } }, t('Save & Apply', '保存并应用')),
					E('button', { 'class': 'btn cbi-button', 'click': function() { callGetTemplate().then(function(res) { setValue(res.content || ''); setStatus(t('Template loaded.', '模板已载入。')); }); } }, t('Use template', '使用模板')),
					E('button', { 'class': 'btn cbi-button', 'click': function() { callDiscardYaml().then(function() { return callGetYaml(); }).then(function(res) { setValue(res.content || ''); setStatus(t('Temporary YAML changes discarded.', '临时 YAML 修改已丢弃。')); }); } }, t('Discard temporary', '丢弃临时修改'))
				]),
				E('div', { 'class': 'agh-editor' }, textarea),
				statusBox
			])
		]);

		ensureCodeMirror().then(function() {
			if (!window.CodeMirror)
				return;
			editor = window.CodeMirror.fromTextArea(textarea, {
				mode: 'yaml',
				theme: 'dracula',
				lineNumbers: true,
				lineWrapping: false,
				indentUnit: 2,
				tabSize: 2
			});
		}).catch(function(err) {
			setStatus(t('CodeMirror failed to load, using textarea: ', 'CodeMirror 加载失败，已回退为文本框：') + err.message);
		});

		return node;
	}
});
