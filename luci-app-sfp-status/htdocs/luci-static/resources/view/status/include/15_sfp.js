'use strict';
'require baseclass';
'require rpc';
'require uci';

const callGetStatuses = rpc.declare({
	object: 'luci.sfp-status',
	method: 'getStatuses',
	params: [ 'interface' ],
	expect: {}
});

let lastSuccessfulReply = null;

function valueOrDash(value) {
	if (value == null)
		return '-';

	const stringValue = String(value).trim();
	return stringValue !== '' ? stringValue : '-';
}

function normalizeContent(content) {
	return Array.isArray(content) ? content : [ content ];
}

function buildTable(fields, status, options) {
	const table = E('table', { 'class': 'table' });
	const header = options && options.header;

	if (header) {
		table.appendChild(E('tr', { 'class': 'tr table-titles' }, [
			E('th', { 'class': 'th left', 'width': '33%' }, normalizeContent(header.label)),
			E('th', { 'class': 'th left' }, normalizeContent(header.value))
		]));
	}

	for (let index = 0; index < fields.length; index++) {
		const field = fields[index];
		const content = field.render ? field.render(status) : valueOrDash(status?.[field.key]);

		table.appendChild(E('tr', { 'class': 'tr' }, [
			E('td', {
				'class': 'td left',
				'width': '24%',
				'data-title': field.dataTitle || _('Name')
			}, [ field.label ]),
			E('td', {
				'class': 'td left',
				'data-title': field.valueTitle || _('Value')
			}, normalizeContent(content))
		]));
	}

	return table;
}

function renderInterfaceBadge(value) {
	return E('span', { 'class': 'ifacebadge' }, [ valueOrDash(value) ]);
}

function renderUnavailable(status) {
	return buildTable([
		{ label: _('Status'), render: function() { return valueOrDash(status?.error || _('Unavailable')); } },
		{ label: _('Interface'), render: function() { return renderInterfaceBadge(status?.interface); } },
		{ label: _('Available Interfaces'), render: function() {
			const interfaces = Array.isArray(status?.interfaces) ? status.interfaces : [];
			return interfaces.length ? interfaces.join(', ') : '-';
		} }
	], status || {});
}

function renderModuleOverview(status, sampledAt) {
	if (!status || status.supported === false)
		return renderUnavailable(status);

	return buildTable([
		{ label: 'SFP型号', key: 'module_name' },
		{ label: _('Temperature'), key: 'temperature' },
		{ label: 'SFP速度', key: 'speed' },
		{ label: _('Voltage'), key: 'voltage' },
		{ label: _('Bias Current'), key: 'bias_current' },
		{ label: 'RX Power', key: 'rx_power' },
		{ label: 'TX Power', key: 'tx_power' }
	], status, {
		header: {
			label: _('Module'),
			value: renderInterfaceBadge(status.module_slot || status.interface)
		}
	});
}

function renderMergedOverview(modules, sampledAt) {
	const fields = [
		{ label: 'SFP型号', key: 'module_name' },
		{ label: _('Temperature'), key: 'temperature' },
		{ label: 'SFP速度', key: 'speed' },
		{ label: _('Voltage'), key: 'voltage' },
		{ label: _('Bias Current'), key: 'bias_current' },
		{ label: 'RX Power', key: 'rx_power' },
		{ label: 'TX Power', key: 'tx_power' }
	];
	const table = E('table', { 'class': 'table' });
	const headerCells = [
		E('th', { 'class': 'th left', 'width': '24%' }, [ _('Module') ])
	];

	for (let index = 0; index < modules.length; index++) {
		headerCells.push(E('th', { 'class': 'th left' }, [
			valueOrDash(modules[index]?.module_slot || modules[index]?.interface)
		]));
	}

	table.appendChild(E('tr', { 'class': 'tr table-titles' }, headerCells));

	for (let fieldIndex = 0; fieldIndex < fields.length; fieldIndex++) {
		const field = fields[fieldIndex];
		const rowCells = [
			E('td', {
				'class': 'td left',
				'data-title': _('Name')
			}, [ field.label ])
		];

		for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
			rowCells.push(E('td', {
				'class': 'td left',
				'data-title': _('Value')
			}, [ valueOrDash(modules[moduleIndex]?.[field.key]) ]));
		}

		table.appendChild(E('tr', { 'class': 'tr' }, rowCells));
	}

	return table;
}

function renderOverview(reply) {
	const modules = Array.isArray(reply?.modules) ? reply.modules : [];

	if (!modules.length)
		return renderUnavailable(reply);

	if (modules.length === 1)
		return renderModuleOverview(modules[0], reply?.sampled_at);

	return renderMergedOverview(modules, reply?.sampled_at);
}

function loadStatuses(interfaceName, timeoutMs) {
	const fallback = {
		supported: false,
		interfaces: [],
		modules: [],
		interface: interfaceName || '',
		error: _('Unavailable')
	};

	return new Promise(function(resolve) {
		let settled = false;
		const timer = window.setTimeout(function() {
			if (settled)
				return;

			settled = true;
			resolve(lastSuccessfulReply || fallback);
		}, timeoutMs > 0 ? timeoutMs : 6000);

		Promise.resolve(callGetStatuses(interfaceName)).then(function(status) {
			if (settled)
				return;

			settled = true;
			window.clearTimeout(timer);

			if (Array.isArray(status?.modules) && status.modules.length)
				lastSuccessfulReply = status;

			resolve(status || fallback);
		}).catch(function() {
			if (settled)
				return;

			settled = true;
			window.clearTimeout(timer);
			resolve(lastSuccessfulReply || fallback);
		});
	});
}

return baseclass.extend({
	title: _('SFP'),

	load() {
		return Promise.all([
			L.resolveDefault(uci.load('sfp-status'), null),
			L.resolveDefault(loadStatuses(''), {})
		]);
	},

	render(data) {
		const enabled = uci.get('sfp-status', 'settings', 'overview_enabled');

		if (enabled === '0')
			return null;

		return renderOverview(data ? data[1] : null);
	}
});