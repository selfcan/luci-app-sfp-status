'use strict';
'require view';
'require rpc';

var callGetYaml = rpc.declare({
	object: 'luci.adguardhome',
	method: 'getYaml',
	expect: { '': {} }
});

var callGetTemplateConfig = rpc.declare({
	object: 'luci.adguardhome',
	method: 'getTemplateConfig',
	expect: { '': {} }
});

var callSaveYaml = rpc.declare({
	object: 'luci.adguardhome',
	method: 'saveYaml',
	params: [ 'content', 'apply' ],
	expect: { '': {} }
});

var callDiscardYaml = rpc.declare({
	object: 'luci.adguardhome',
	method: 'discardYaml',
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

function errorMessage(err) {
	return err && err.message ? err.message : t('Unknown error', '未知错误');
}

function isMissingRpcObject(err) {
	return /Object not found/i.test(errorMessage(err));
}

function bundledTemplateContent() {
	return [
		'# Local fallback template used when rpcd template generation is unavailable.',
		'bind_host: 0.0.0.0',
		'bind_port: 3000',
		'users:',
		'- name: root',
		'  password: ""',
		'language: ""',
		'rlimit_nofile: 0',
		'dns:',
		'  bind_host: 0.0.0.0',
		'  port: 5553',
		'  statistics_interval: 1',
		'  protection_enabled: true',
		'  filtering_enabled: true',
		'  filters_update_interval: 24',
		'  blocking_mode: nxdomain',
		'  blocked_response_ttl: 10',
		'  querylog_enabled: false',
		'  querylog_interval: 1',
		'  ratelimit: 0',
		'  ratelimit_whitelist: []',
		'  refuse_any: false',
		'  bootstrap_dns:',
		'  - 223.5.5.5',
		'  - 119.29.29.29',
		'  all_servers: false',
		'  allowed_clients: []',
		'  disallowed_clients: []',
		'  blocked_hosts: []',
		'  parental_block_host: ""',
		'  safebrowsing_block_host: ""',
		'  blocked_services: []',
		'  cache_size: 4194304',
		'  parental_sensitivity: 13',
		'  parental_enabled: false',
		'  safesearch_enabled: false',
		'  safebrowsing_enabled: false',
		'  safebrowsing_cache_size: 1048576',
		'  safesearch_cache_size: 1048576',
		'  parental_cache_size: 1048576',
		'  cache_time: 30',
		'  rewrites: []',
		'  upstream_dns:',
		'  - 223.5.5.5',
		'  - https://dns.alidns.com/dns-query',
		'tls:',
		'  enabled: false',
		'  server_name: ""',
		'  force_https: false',
		'  port_https: 443',
		'  port_dns_over_tls: 853',
		'  certificate_chain: ""',
		'  private_key: ""',
		'  certificate_path: ""',
		'  private_key_path: ""',
		'filters:',
		'- enabled: true',
		'  url: https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt',
		'  name: AdGuard Simplified Domain Names filter',
		'  id: 1',
		'- enabled: true',
		'  url: https://adaway.org/hosts.txt',
		'  name: AdAway',
		'  id: 2',
		'user_rules: []',
		'dhcp:',
		'  enabled: false',
		'  interface_name: ""',
		'  gateway_ip: ""',
		'  subnet_mask: ""',
		'  range_start: ""',
		'  range_end: ""',
		'  lease_duration: 86400',
		'  icmp_timeout_msec: 1000',
		'clients: []',
		'log_file: ""',
		'verbose: false',
		'schema_version: 5'
	].join('\n');
}

function applyBundledTemplate(setValue, updateSource, statusBox, message) {
	setValue(bundledTemplateContent());
	updateSource(t('Bundled template', '内置模板'));
	addStatusNotice(statusBox, 'warning', message);
}

function addStatusNotice(node, type, text) {
	node.className = 'adh-inline-status adh-inline-status-' + type;
	node.textContent = text;
}

function ensureStyle(url, id) {
	if (document.getElementById(id))
		return;

	document.head.appendChild(E('link', {
		id: id,
		rel: 'stylesheet',
		href: url
	}));
}

function ensureScript(url, id) {
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

function ensureCodeMirror() {
	ensureStyle(L.resource('codemirror/lib/codemirror.css'), 'adh-codemirror-base');
	ensureStyle(L.resource('codemirror/theme/dracula.css'), 'adh-codemirror-theme');

	return ensureScript(L.resource('codemirror/lib/codemirror.js'), 'adh-codemirror-script').then(function() {
		return ensureScript(L.resource('codemirror/mode/yaml/yaml.js'), 'adh-codemirror-yaml');
	});
}

var pageStyle = [
	'.adh-editor-page { --adh-ink:#1f2a55; --adh-muted:#66718f; --adh-line:#dbe3f0; --adh-panel:#ffffff; --adh-blue:#5b6ee1; --adh-green:#1f9b62; --adh-red:#d84b63; display:grid; gap:18px; color:var(--adh-ink); }',
	'.adh-editor-hero { position:relative; overflow:hidden; border-radius:22px; padding:26px; color:var(--adh-ink); background:linear-gradient(135deg,#f8fbff 0%,#edf3fb 100%); border:1px solid var(--adh-line); box-shadow:0 18px 40px rgba(35,48,85,.08); }',
	'.adh-editor-hero:before { content:""; position:absolute; left:-60px; bottom:-90px; width:240px; height:240px; border-radius:50%; background:radial-gradient(circle, rgba(91,110,225,.12), rgba(91,110,225,0)); }',
	'.adh-editor-hero h2 { position:relative; z-index:1; display:inline; margin:0; padding:0; border:0; border-radius:0; background:transparent !important; box-shadow:none; font-size:31px; font-weight:800; color:#151d4a; }',
	'.adh-editor-hero p { position:relative; z-index:1; margin:10px 0 0; max-width:62rem; line-height:1.75; color:var(--adh-muted); }',
	'.adh-editor-chip-row { position:relative; z-index:1; display:flex; flex-wrap:wrap; gap:10px; margin-top:18px; }',
	'.adh-editor-chip { display:inline-flex; align-items:center; padding:8px 13px; border-radius:999px; background:rgba(255,255,255,.72); border:1px solid var(--adh-line); font-size:12px; font-weight:700; color:#34405f; }',
	'.adh-editor-card { border-radius:18px; border:1px solid var(--adh-line); background:var(--adh-panel); box-shadow:0 12px 30px rgba(35,48,85,.06); overflow:hidden; }',
	'.adh-editor-toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between; padding:18px 20px; border-bottom:1px solid rgba(22,54,62,.08); }',
	'.adh-editor-toolbar-left, .adh-editor-toolbar-right { display:flex; flex-wrap:wrap; gap:10px; align-items:center; }',
	'.adh-editor-shell { padding:20px; }',
	'.adh-editor-textarea { width:100%; min-height:560px; }',
	'.adh-editor-note { padding:16px 20px 20px; color:var(--adh-muted); line-height:1.75; }',
	'.adh-inline-status { margin-top:0; padding:12px 14px; border-radius:14px; font-size:13px; line-height:1.7; }',
	'.adh-inline-status-info { background:rgba(29,91,102,.08); color:#204d56; }',
	'.adh-inline-status-success { background:rgba(56,158,94,.10); color:#19643b; }',
	'.adh-inline-status-warning { background:rgba(214,149,39,.12); color:#8e5f11; }',
	'.adh-inline-status-error { background:rgba(209,73,91,.12); color:#8e2f3f; }',
	'.adh-editor-output { margin:18px 20px 20px; padding:16px; border-radius:16px; background:#111827; color:#d7e7de; font:12px/1.7 Consolas, Monaco, monospace; white-space:pre-wrap; word-break:break-word; min-height:110px; }',
	'.CodeMirror { height:auto; min-height:560px; border-radius:18px; border:1px solid rgba(18,39,50,.22); font-size:13px; line-height:1.7; }'
].join('\n');

return view.extend({
	load: function() {
		return Promise.all([
			L.resolveDefault(callGetYaml(), {})
		]);
	},

	render: function(data) {
		var payload = data[0] || {};
		var sourceChip = E('span', { 'class': 'adh-editor-chip' }, t('Source: ', '来源：') + (payload.source || t('Unknown', '未知')));
		var statusBox = E('div', { 'class': 'adh-inline-status adh-inline-status-info' }, t('Use this editor to validate and apply YAML changes through rpcd. Invalid content stays in /tmp so you can continue editing without losing work.', '通过 rpcd 在这里校验并应用 YAML 改动。无效配置会留在 /tmp，方便继续修改而不会丢稿。'));
		var outputBox = E('pre', { 'class': 'adh-editor-output' }, payload.test_log || t('Validation output will appear here.', '校验输出会显示在这里。'));
		var textarea = E('textarea', { 'class': 'adh-editor-textarea' }, [ payload.content || '' ]);
		var saveBtn = E('button', { 'class': 'btn cbi-button cbi-button-save' }, t('Validate and apply', '校验并应用'));
		var templateBtn = E('button', { 'class': 'btn cbi-button' }, t('Load generated template', '载入生成模板'));
		var reloadBtn = E('button', { 'class': 'btn cbi-button' }, t('Reload current content', '重新读取当前内容'));
		var discardBtn = E('button', { 'class': 'btn cbi-button cbi-button-remove' }, t('Discard temp draft', '丢弃临时草稿'));
		var editor = null;

		function currentValue() {
			return editor ? editor.getValue() : textarea.value;
		}

		function setValue(nextValue) {
			if (editor)
				editor.setValue(nextValue || '');
			else
				textarea.value = nextValue || '';
		}

		function updateSource(label) {
			sourceChip.textContent = t('Source: ', '来源：') + label;
		}

		function reloadYaml() {
			addStatusNotice(statusBox, 'info', t('Reloading YAML content...', '正在重新读取 YAML 内容...'));
			return callGetYaml().then(function(nextPayload) {
				setValue(nextPayload.content || '');
				outputBox.textContent = nextPayload.test_log || t('Validation output will appear here.', '校验输出会显示在这里。');
				updateSource(nextPayload.source || t('Unknown', '未知'));
				addStatusNotice(statusBox, 'success', t('YAML content reloaded.', 'YAML 内容已重新载入。'));
			}).catch(function(err) {
				addStatusNotice(statusBox, 'error', t('Failed to reload YAML content: ', '重新读取 YAML 内容失败：') + err.message);
			});
		}

		saveBtn.addEventListener('click', function(ev) {
			ev.preventDefault();
			addStatusNotice(statusBox, 'info', t('Validating and saving YAML...', '正在校验并保存 YAML...'));
			callSaveYaml(currentValue(), true).then(function(result) {
				outputBox.textContent = result.output || t('Config saved without validation warnings.', '配置已保存，没有额外校验警告。');
				if (!result.ok) {
					addStatusNotice(statusBox, 'error', t('Validation failed. The draft remains in /tmp for further editing.', '校验失败，草稿仍保留在 /tmp，便于继续编辑。'));
					updateSource(t('Temp draft', '临时草稿'));
					return;
				}

				updateSource(t('Config file', '配置文件'));
				addStatusNotice(statusBox, 'success', t('YAML saved and reload has been triggered.', 'YAML 已保存，并已触发服务重载。'));
			}).catch(function(err) {
				addStatusNotice(statusBox, 'error', t('Failed to save YAML: ', '保存 YAML 失败：') + err.message);
			});
		});

		templateBtn.addEventListener('click', function(ev) {
			ev.preventDefault();
			callGetTemplateConfig().then(function(result) {
				var content = result && typeof result.content === 'string' ? result.content : '';

				if (!content.trim()) {
					applyBundledTemplate(
						setValue,
						updateSource,
						statusBox,
						t('The router template file is missing or empty. Loaded the bundled fallback template instead. Review upstream DNS values before applying it.', '路由器上的模板文件缺失或为空，已改为载入内置回退模板。应用前请先检查上游 DNS 配置。')
					);
					return;
				}

				setValue(content);
				updateSource(t('Generated template', '生成模板'));
				addStatusNotice(statusBox, 'warning', t('Template content loaded into the editor. It is not active until you validate and apply it.', '模板内容已经载入编辑器，只有在你校验并应用之后才会真正生效。'));
			}).catch(function(err) {
				if (isMissingRpcObject(err)) {
					applyBundledTemplate(
						setValue,
						updateSource,
						statusBox,
						t('The rpcd template endpoint is unavailable on this device. Loaded the bundled fallback template instead. Review upstream DNS values before applying it, then upgrade or reinstall the package to restore backend template generation.', '当前设备上的 rpcd 模板接口不可用，已改为载入内置回退模板。应用前请先检查上游 DNS 配置，然后升级或重装软件包以恢复后端模板生成功能。')
					);
					return;
				}

				addStatusNotice(statusBox, 'error', t('Failed to load template: ', '载入模板失败：') + errorMessage(err));
			});
		});

		reloadBtn.addEventListener('click', function(ev) {
			ev.preventDefault();
			reloadYaml();
		});

		discardBtn.addEventListener('click', function(ev) {
			ev.preventDefault();
			callDiscardYaml().then(function() {
				addStatusNotice(statusBox, 'success', t('Temporary YAML draft discarded.', '临时 YAML 草稿已丢弃。'));
				return reloadYaml();
			}).catch(function(err) {
				addStatusNotice(statusBox, 'error', t('Failed to discard draft: ', '丢弃草稿失败：') + err.message);
			});
		});

		var page = E('div', { 'class': 'adh-editor-page' }, [
			E('style', {}, pageStyle),
			E('div', { 'class': 'adh-editor-hero' }, [
				E('h2', {}, t('YAML Editor', 'YAML 编辑器')),
				E('p', {}, t('The legacy manual page is replaced by a CodeMirror-based editor. Template generation, validation and apply all go through the new rpcd backend, which keeps the file-backed workflow intact.', '旧的手动配置页已经被基于 CodeMirror 的编辑器替代。模板生成、校验和应用都走新的 rpcd 后端，保留了这个项目原本的文件型工作流。')),
				E('div', { 'class': 'adh-editor-chip-row' }, [
					sourceChip,
					E('span', { 'class': 'adh-editor-chip' }, payload.test_log ? t('Draft has validation output', '当前草稿存在校验输出') : t('No pending validation output', '当前没有待处理校验输出'))
				])
			]),
			E('div', { 'class': 'adh-editor-card' }, [
				E('div', { 'class': 'adh-editor-toolbar' }, [
					E('div', { 'class': 'adh-editor-toolbar-left' }, [ saveBtn, templateBtn ]),
					E('div', { 'class': 'adh-editor-toolbar-right' }, [ reloadBtn, discardBtn ])
				]),
				E('div', { 'class': 'adh-editor-shell' }, [ textarea ]),
				E('div', { 'class': 'adh-editor-note' }, statusBox),
				outputBox
			])
		]);

		ensureCodeMirror().then(function() {
			editor = window.CodeMirror.fromTextArea(textarea, {
				mode: 'yaml',
				lineNumbers: true,
				lineWrapping: false,
				theme: 'dracula'
			});
			editor.refresh();
		}).catch(function(err) {
			addStatusNotice(statusBox, 'warning', t('CodeMirror failed to load, falling back to plain textarea: ', 'CodeMirror 加载失败，已回退为普通文本框：') + err.message);
		});

		return page;
	}
});