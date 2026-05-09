'use strict';
'require view';
'require form';
'require poll';
'require rpc';
'require uci';

var callGetStatus = rpc.declare({
	object: 'luci.fan',
	method: 'getStatus',
	expect: { '': {} }
});

var dashboardStyle = [
	'.lf-page { display: grid; gap: 18px; }',
	'.lf-dashboard-shell { position: relative; overflow: hidden; border: 0; border-radius: 24px; box-shadow: 0 20px 40px rgba(12, 37, 45, 0.16); background: linear-gradient(135deg, #15363b 0%, #1d544b 48%, #87601f 100%); }',
	'.lf-dashboard-shell:before, .lf-dashboard-shell:after { content: ""; position: absolute; inset: auto; pointer-events: none; }',
	'.lf-dashboard-shell:before { top: -60px; right: -80px; width: 260px; height: 260px; border-radius: 50%; background: radial-gradient(circle, rgba(255, 210, 122, 0.28) 0%, rgba(255, 210, 122, 0) 70%); }',
	'.lf-dashboard-shell:after { left: -100px; bottom: -120px; width: 320px; height: 320px; border-radius: 50%; background: radial-gradient(circle, rgba(125, 244, 205, 0.22) 0%, rgba(125, 244, 205, 0) 72%); }',
	'.lf-dashboard { position: relative; z-index: 1; padding: 28px; color: #eef6ef; }',
	'.lf-hero { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.85fr); gap: 24px; align-items: stretch; }',
	'.lf-eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px; background: rgba(255, 255, 255, 0.12); font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; }',
	'.lf-copy h3 { margin: 16px 0 10px; font-size: 30px; line-height: 1.15; color: #ffffff; }',
	'.lf-copy p { max-width: 52rem; margin: 0; font-size: 14px; line-height: 1.7; color: rgba(238, 246, 239, 0.88); }',
	'.lf-chip-row, .lf-metrics, .lf-grid, .lf-config-grid, .lf-ladder-scale { display: grid; gap: 14px; }',
	'.lf-chip-row { grid-template-columns: repeat(auto-fit, minmax(140px, max-content)); margin-top: 18px; }',
	'.lf-chip { display: inline-flex; align-items: center; justify-content: center; padding: 8px 14px; border-radius: 999px; background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.12); font-size: 12px; line-height: 1.4; color: #ffffff; }',
	'.lf-chip-muted { background: rgba(7, 20, 26, 0.22); color: rgba(238, 246, 239, 0.86); }',
	'.lf-chip-alert { background: rgba(246, 135, 83, 0.2); border-color: rgba(246, 135, 83, 0.35); }',
	'.lf-runtime-badge[data-state="active"] { background: #ffcb72; border-color: #ffcb72; color: #2d1f04; }',
	'.lf-runtime-badge[data-state="transition"] { background: #9adfb9; border-color: #9adfb9; color: #143325; }',
	'.lf-runtime-badge[data-state="standby"] { background: #cbe7f0; border-color: #cbe7f0; color: #173843; }',
	'.lf-runtime-badge[data-state="disabled"], .lf-runtime-badge[data-state="unsupported"] { background: rgba(255, 255, 255, 0.16); color: #ffffff; }',
	'.lf-visual { display: grid; gap: 16px; align-content: start; }',
	'.lf-orb { position: relative; min-height: 280px; border-radius: 26px; background: linear-gradient(180deg, rgba(10, 24, 28, 0.34), rgba(255, 255, 255, 0.08)); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06); }',
	'.lf-orb canvas { display: block; margin: 0 auto; max-width: 100%; }',
	'.lf-temp-readout { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }',
	'.lf-temp-number { font-size: 42px; line-height: 1; font-weight: 700; }',
	'.lf-temp-unit { margin-top: 4px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(238, 246, 239, 0.72); }',
	'.lf-temp-caption { margin-top: 8px; font-size: 12px; color: rgba(238, 246, 239, 0.82); }',
	'.lf-demand { padding: 16px 18px 18px; border-radius: 18px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.1); }',
	'.lf-demand-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 13px; }',
	'.lf-demand-row strong { font-size: 18px; }',
	'.lf-demand-bar { margin-top: 10px; height: 12px; border-radius: 999px; background: rgba(5, 16, 19, 0.34); overflow: hidden; }',
	'#lf-demand-fill { height: 100%; width: 0; border-radius: inherit; background: linear-gradient(90deg, #7de2b8 0%, #f3d07b 55%, #f68753 100%); transition: width 0.35s ease; }',
	'.lf-metrics { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 22px; }',
	'.lf-metric, .lf-card, .lf-ladder-card { padding: 18px; border-radius: 20px; background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.11); backdrop-filter: blur(10px); }',
	'.lf-metric-label { font-size: 12px; line-height: 1.5; color: rgba(238, 246, 239, 0.76); }',
	'.lf-metric-value { margin-top: 10px; font-size: 28px; line-height: 1.1; font-weight: 700; color: #ffffff; }',
	'.lf-ladder-card { margin-top: 22px; }',
	'.lf-ladder-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }',
	'.lf-ladder-head h4, .lf-card h4 { margin: 0; font-size: 16px; color: #ffffff; }',
	'.lf-source-pill { padding: 6px 10px; border-radius: 999px; background: rgba(7, 20, 26, 0.22); font-size: 12px; color: rgba(238, 246, 239, 0.84); }',
	'.lf-ladder-track { position: relative; height: 18px; margin-top: 18px; border-radius: 999px; background: linear-gradient(90deg, rgba(125, 226, 184, 0.45) 0%, rgba(250, 206, 118, 0.72) 55%, rgba(246, 135, 83, 0.95) 100%); overflow: hidden; }',
	'.lf-ladder-track:before { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(6, 18, 22, 0.25), rgba(255, 255, 255, 0.04)); }',
	'.lf-marker { position: absolute; top: -5px; width: 2px; height: 28px; background: #ffffff; box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.16); transform: translateX(-50%); }',
	'.lf-marker-current { height: 34px; top: -8px; background: #ffd17c; box-shadow: 0 0 0 4px rgba(255, 209, 124, 0.18); }',
	'.lf-ladder-scale { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 16px; }',
	'.lf-scale-item { padding: 10px 12px; border-radius: 14px; background: rgba(7, 20, 26, 0.2); }',
	'.lf-scale-item span { display: block; font-size: 11px; line-height: 1.5; color: rgba(238, 246, 239, 0.76); }',
	'.lf-scale-item strong { display: block; margin-top: 6px; font-size: 18px; line-height: 1.2; color: #ffffff; }',
	'.lf-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 22px; }',
	'.lf-card p { margin: 12px 0 0; font-size: 13px; line-height: 1.7; color: rgba(238, 246, 239, 0.82); }',
	'.lf-preset-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }',
	'.lf-preset { min-height: 48px; padding: 0 14px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.16); background: rgba(7, 20, 26, 0.22); color: #ffffff; box-shadow: none; cursor: pointer; transition: transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease; }',
	'.lf-preset:hover, .lf-preset:focus { transform: translateY(-1px); background: rgba(125, 226, 184, 0.18); border-color: rgba(125, 226, 184, 0.45); }',
	'.lf-note, .lf-insights, .lf-config-grid { margin-top: 14px; }',
	'.lf-insight { margin: 0 0 10px; padding: 10px 12px; border-radius: 14px; background: rgba(7, 20, 26, 0.2); font-size: 13px; line-height: 1.6; color: rgba(238, 246, 239, 0.9); }',
	'.lf-config-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }',
	'.lf-config-item { padding: 10px 12px; border-radius: 14px; background: rgba(7, 20, 26, 0.2); }',
	'.lf-config-item span { display: block; font-size: 11px; line-height: 1.5; color: rgba(238, 246, 239, 0.76); }',
	'.lf-config-item strong { display: block; margin-top: 6px; font-size: 18px; line-height: 1.3; color: #ffffff; }',
	'.lf-dashboard-shell + .cbi-map { margin-top: 0; border-radius: 22px; border: 1px solid rgba(19, 57, 62, 0.08); box-shadow: 0 12px 30px rgba(17, 48, 54, 0.08); overflow: hidden; background: linear-gradient(180deg, rgba(251, 252, 250, 0.98), rgba(243, 247, 244, 0.98)); }',
	'.lf-dashboard-shell + .cbi-map > h2, .lf-dashboard-shell + .cbi-map > .cbi-map-descr { padding-left: 24px; padding-right: 24px; }',
	'.lf-dashboard-shell + .cbi-map .cbi-section { margin: 0; border: 0; box-shadow: none; background: transparent; }',
	'.lf-dashboard-shell + .cbi-map .cbi-section-node { padding-top: 6px; background: transparent; }',
	'.lf-dashboard-shell + .cbi-map .cbi-section-node h3 { margin-top: 4px; font-size: 20px; color: #17373c; }',
	'.lf-dashboard-shell + .cbi-map .cbi-value { padding: 14px 18px; border-top: 1px solid rgba(23, 55, 60, 0.08); }',
	'.lf-dashboard-shell + .cbi-map .cbi-value-title { font-weight: 600; color: #17373c; }',
	'.lf-dashboard-shell + .cbi-map input[type="text"], .lf-dashboard-shell + .cbi-map input[type="password"], .lf-dashboard-shell + .cbi-map select { border-radius: 12px; border-color: rgba(23, 55, 60, 0.16); box-shadow: none; }',
	'.lf-dashboard-shell + .cbi-map input[type="range"] { width: 100%; accent-color: #1d6d5d; }',
	'.lf-range-output { display: inline-flex; align-items: center; justify-content: center; min-width: 72px; margin-top: 10px; padding: 6px 12px; border-radius: 999px; background: rgba(23, 55, 60, 0.08); color: #17373c; font-size: 12px; font-weight: 600; }',
	'@media screen and (max-width: 1180px) { .lf-hero, .lf-grid { grid-template-columns: 1fr; } .lf-metrics, .lf-preset-list, .lf-ladder-scale { grid-template-columns: repeat(2, minmax(0, 1fr)); } }',
	'@media screen and (max-width: 760px) { .lf-dashboard { padding: 20px; } .lf-copy h3 { font-size: 24px; } .lf-metrics, .lf-preset-list, .lf-grid, .lf-config-grid, .lf-ladder-scale { grid-template-columns: 1fr; } .lf-orb { min-height: 240px; } }'
].join('\n');

var texts = {
	enabled: _('Enabled'),
	disabled: _('Disabled'),
	active: _('Cooling active'),
	transition: _('Modulating'),
	standby: _('Standby'),
	unsupported: _('Unavailable'),
	unavailable: _('Sensor unavailable'),
	toStart: _('to start'),
	beforeNextTrip: _('before next trip'),
	thresholdReached: _('Threshold reached'),
	ceilingHidden: _('Ceiling not exposed'),
	bpiTip: _('BPI-R4 routers usually benefit from a slightly lower smart start temperature when Wi-Fi or NSS load ramps up quickly.'),
	hysteresisTip: _('Off temperature should stay at least 3 C below the start threshold for stable smart mode modulation.'),
	currentAboveStart: _('Current temperature is already above the smart start threshold. Save carefully to avoid sudden fan jumps.'),
	saveApply: _('Save & Apply below to persist changes.'),
	enableAndSave: _('Enable the service and Save & Apply to start the fan daemon.'),
	loadedToForm: _('Loaded into the form'),
	notAvailable: _('Not available'),
	unsupportedHint: _('This device does not currently expose a writable pwm-fan hwmon interface or an active writable fan trip point.'),
	modeUnsupportedHint: _('Turbo and Manual modes require pwm-fan hwmon support on the target board.'),
	telemetryWaiting: _('Waiting for telemetry...'),
	monitoringState: _('Monitoring state'),
	currentDevice: _('Current device'),
	bpiHero: _('BPI-R4 tuned layout with live CPU temperature, PWM duty, tachometer feedback and three operating modes.'),
	genericHero: _('Live OpenWrt cooling dashboard with smart, manual and turbo profiles when the target hardware exposes pwm-fan telemetry.'),
	turbo: _('Turbo'),
	smart: _('Smart'),
	manual: _('Manual'),
	turboHint: _('Turbo mode keeps the fan at maximum duty after Save & Apply.'),
	smartHint: _('Smart mode follows CPU temperature and ramps the pwm-fan duty automatically.'),
	manualHint: _('Manual mode applies the selected duty target after Save & Apply.'),
	modePending: _('Mode target'),
	currentDuty: _('Current fan duty')
};

function toNumber(value) {
	var parsed = parseFloat(value);
	return isNaN(parsed) ? null : parsed;
}

function toBool(value) {
	return value === true || value === 1 || value === '1';
}

function roundTemp(value) {
	if (value === null || typeof value === 'undefined' || isNaN(value))
		return null;

	return Math.round(value * 10) / 10;
}

function clamp(value, minimum, maximum) {
	if (value < minimum)
		return minimum;
	if (value > maximum)
		return maximum;
	return value;
}

function escapeHtml(value) {
	return String(value == null ? '' : value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function normalizeStatus(data) {
	data = data || {};
	var supported = data.supported;

	if (supported == null)
		supported = !!(data.zone || data.fan_on_temp || data.pwm_percent);

	return {
		supported: toBool(supported),
		thermal_supported: toBool(data.thermal_supported),
		pwm_supported: toBool(data.pwm_supported),
		mode_supported: toBool(data.mode_supported),
		error: data.error || '',
		zone: data.zone || '',
		trip_point: data.trip_point,
		thermal_type: data.thermal_type || '',
		zone_temp: toNumber(data.zone_temp),
		fan_on_temp: toNumber(data.fan_on_temp),
		fan_off_temp: toNumber(data.fan_off_temp),
		configured_on_temp: toNumber(data.configured_on_temp),
		configured_off_temp: toNumber(data.configured_off_temp),
		hysteresis: toNumber(data.hysteresis),
		next_trip_temp: toNumber(data.next_trip_temp),
		headroom: toNumber(data.headroom),
		start_delta: toNumber(data.start_delta),
		load_ratio: toNumber(data.load_ratio) || 0,
		enabled: toBool(data.enabled),
		state: data.state || 'disabled',
		board_name: data.board_name || '',
		model_name: data.model_name || '',
		is_bpi_r4: toBool(data.is_bpi_r4),
		profile: data.profile || 'generic',
		mode: data.mode || 'smart',
		manual_pwm: toNumber(data.manual_pwm),
		poll_interval: toNumber(data.poll_interval),
		hwmon_name: data.hwmon_name || '',
		hwmon_path: data.hwmon_path || '',
		pwm_raw: toNumber(data.pwm_raw),
		pwm_percent: toNumber(data.pwm_percent),
		pwm_enable_mode: data.pwm_enable_mode || '',
		fan_rpm: toNumber(data.fan_rpm)
	};
}

function recommendedSmartWindow(status) {
	var nextTrip = status.next_trip_temp;
	var baseOn = status.configured_on_temp || status.fan_on_temp || (status.is_bpi_r4 ? 55 : 52);
	var maxOn = nextTrip !== null ? Math.max(6, Math.floor(nextTrip - 1)) : 85;
	var on = status.is_bpi_r4 ? Math.max(baseOn, 55) : Math.max(baseOn, 52);
	var off = on - 5;

	on = clamp(Math.round(on), 6, maxOn);
	off = clamp(Math.round(off), 5, on - 1);

	return {
		on: on,
		off: off
	};
}

return view.extend({
	requestFrame: function(callback) {
		if (window.requestAnimationFrame)
			return window.requestAnimationFrame.call(window, callback);

		return window.setTimeout(function() { callback(Date.now()); }, 33);
	},

	degreeUnit: ' ' + String.fromCharCode(176) + 'C',
	lastTick: 0,
	rotorAngle: 0,

	load: function() {
		return Promise.all([
			uci.load('luci-fan'),
			L.resolveDefault(callGetStatus(), {})
		]);
	},

	formatTemp: function(value) {
		var rounded = roundTemp(value);
		if (rounded === null)
			return '--';

		return (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)) + this.degreeUnit;
	},

	formatReadout: function(value) {
		var rounded = roundTemp(value);
		if (rounded === null)
			return '--';

		return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
	},

	formatPercent: function(value) {
		if (value === null || typeof value === 'undefined' || isNaN(value))
			return '--';

		return Math.round(value) + '%';
	},

	formatRpm: function(value) {
		if (value === null || typeof value === 'undefined' || isNaN(value))
			return texts.notAvailable;

		return Math.round(value) + ' RPM';
	},

	modeLabel: function(mode) {
		switch (mode) {
		case 'turbo':
			return texts.turbo;
		case 'manual':
			return texts.manual;
		default:
			return texts.smart;
		}
	},

	setText: function(node, value) {
		if (node)
			node.textContent = value;
	},

	readPreviewNumber: function(field, fallback) {
		if (!field)
			return fallback;

		var value = toNumber(field.value);
		return value === null ? fallback : value;
	},

	getPreview: function() {
		return {
			enabled: this.fields.enabled ? !!this.fields.enabled.checked : !!(this.runtime && this.runtime.enabled),
			mode: this.fields.mode ? this.fields.mode.value : (this.runtime ? this.runtime.mode : 'smart'),
			manual_pwm: this.readPreviewNumber(this.fields.manual, this.runtime ? this.runtime.manual_pwm : 70),
			on: this.readPreviewNumber(this.fields.on, this.runtime ? this.runtime.configured_on_temp || this.runtime.fan_on_temp : null),
			off: this.readPreviewNumber(this.fields.off, this.runtime ? this.runtime.configured_off_temp || this.runtime.fan_off_temp : null)
		};
	},

	deriveDemand: function(preview) {
		if (!preview.enabled)
			return 0;

		if (preview.mode === 'turbo')
			return 1;

		if (preview.mode === 'manual' && preview.manual_pwm !== null)
			return clamp(preview.manual_pwm / 100, 0, 1);

		if (this.runtime && this.runtime.pwm_percent !== null)
			return clamp(this.runtime.pwm_percent / 100, 0, 1);

		if (!this.runtime || this.runtime.zone_temp === null)
			return 0;

		var nextTrip = this.runtime.next_trip_temp;
		if (preview.off !== null && nextTrip !== null && nextTrip > preview.off)
			return clamp((this.runtime.zone_temp - preview.off) / (nextTrip - preview.off), 0, 1);

		if (preview.on !== null && preview.on > 0)
			return clamp(this.runtime.zone_temp / preview.on, 0, 1);

		return clamp(this.runtime.load_ratio || 0, 0, 1);
	},

	updateMetricCards: function(preview) {
		this.setText(this.nodes.metricCpu, this.formatTemp(this.runtime && this.runtime.zone_temp));
		this.setText(this.nodes.metricFan, this.formatRpm(this.runtime && this.runtime.fan_rpm));
		this.setText(this.nodes.metricPwm, this.formatPercent(this.runtime && this.runtime.pwm_percent));
		this.setText(this.nodes.metricMode, this.modeLabel(preview.mode));
		this.setText(this.nodes.configEnabled, preview.enabled ? texts.enabled : texts.disabled);
		this.setText(this.nodes.configMode, this.modeLabel(preview.mode));
		this.setText(this.nodes.configManual, this.formatPercent(preview.manual_pwm));
		this.setText(this.nodes.configOn, this.formatTemp(preview.on));
		this.setText(this.nodes.configOff, this.formatTemp(preview.off));
		this.setText(this.nodes.configRpm, this.formatRpm(this.runtime && this.runtime.fan_rpm));
	},

	setMarker: function(node, value, minimum, maximum) {
		if (!node)
			return;

		if (value === null || maximum <= minimum) {
			node.style.display = 'none';
			return;
		}

		node.style.display = 'block';
		node.style.left = (((value - minimum) / (maximum - minimum)) * 100) + '%';
	},

	updateLadder: function(preview) {
		var values = [];
		var nextTrip = this.runtime ? this.runtime.next_trip_temp : null;

		if (preview.off !== null)
			values.push(preview.off);
		if (this.runtime && this.runtime.zone_temp !== null)
			values.push(this.runtime.zone_temp);
		if (preview.on !== null)
			values.push(preview.on);
		if (nextTrip !== null)
			values.push(nextTrip);

		if (!values.length)
			return;

		var minimum = Math.max(0, Math.floor(Math.min.apply(Math, values) - 4));
		var maximum = Math.ceil(Math.max.apply(Math, values) + 4);
		if (maximum <= minimum)
			maximum = minimum + 10;

		this.setMarker(this.nodes.markerOff, preview.off, minimum, maximum);
		this.setMarker(this.nodes.markerCurrent, this.runtime ? this.runtime.zone_temp : null, minimum, maximum);
		this.setMarker(this.nodes.markerOn, preview.on, minimum, maximum);
		this.setMarker(this.nodes.markerNext, nextTrip, minimum, maximum);

		this.setText(this.nodes.scaleOff, this.formatTemp(preview.off));
		this.setText(this.nodes.scaleCurrent, this.formatTemp(this.runtime && this.runtime.zone_temp));
		this.setText(this.nodes.scaleOn, this.formatTemp(preview.on));
		this.setText(this.nodes.scaleNext, nextTrip !== null ? this.formatTemp(nextTrip) : texts.notAvailable);
	},

	updateDemand: function(preview) {
		var demand = this.deriveDemand(preview);
		var hue = Math.round(150 - (demand * 120));

		this.nodes.demandFill.style.width = Math.round(demand * 100) + '%';
		this.nodes.demandFill.style.background = 'linear-gradient(90deg, hsl(148, 60%, 64%) 0%, hsl(42, 88%, 72%) 58%, hsl(' + Math.max(12, hue) + ', 88%, 62%) 100%)';
		this.setText(this.nodes.demandValue, Math.round(demand * 100) + '%');
		return demand;
	},

	updateManualOutput: function(preview) {
		if (this.manualOutput)
			this.manualOutput.textContent = this.formatPercent(preview.manual_pwm);
	},

	renderInsights: function(preview) {
		var hints = [];
		var startDelta = (this.runtime && this.runtime.zone_temp !== null && preview.on !== null) ? (preview.on - this.runtime.zone_temp) : null;

		if (!this.runtime || !this.runtime.supported) {
			hints.push(texts.unsupportedHint);
		} else if (!preview.enabled) {
			hints.push(texts.enableAndSave);
		} else if (preview.mode === 'turbo') {
			hints.push(texts.turboHint);
		} else if (preview.mode === 'manual') {
			hints.push(texts.manualHint + ' ' + texts.modePending + ': ' + this.formatPercent(preview.manual_pwm) + '.');
		} else {
			hints.push(texts.smartHint);

			if (startDelta !== null) {
				if (startDelta <= 0)
					hints.push(texts.thresholdReached);
				else
					hints.push(this.formatTemp(startDelta) + ' ' + texts.toStart);
			}

			if (preview.on !== null && preview.off !== null && (preview.on - preview.off) < 3)
				hints.push(texts.hysteresisTip);
			else if (this.runtime && this.runtime.zone_temp !== null && preview.on !== null && this.runtime.zone_temp >= preview.on)
				hints.push(texts.currentAboveStart);
			else if (this.runtime && this.runtime.is_bpi_r4)
				hints.push(texts.bpiTip);
		}

		if (this.runtime && this.runtime.headroom !== null)
			hints.push(this.formatTemp(this.runtime.headroom) + ' ' + texts.beforeNextTrip);
		else
			hints.push(texts.ceilingHidden);

		if (!this.runtime || !this.runtime.mode_supported)
			hints.push(texts.modeUnsupportedHint);
		else
			hints.push(texts.saveApply);

		this.nodes.insights.innerHTML = '';
		hints.forEach(function(hint) {
			this.nodes.insights.appendChild(E('p', { 'class': 'lf-insight' }, [ hint ]));
		}, this);
	},

	syncFormState: function() {
		if (!this.runtime)
			return;

		var preview = this.getPreview();
		this.updateMetricCards(preview);
		this.updateLadder(preview);
		this.updateDemand(preview);
		this.updateManualOutput(preview);
		this.renderInsights(preview);
	},

	pickProfile: function(name) {
		var defaults = recommendedSmartWindow(this.runtime || {});

		if (this.fields.mode)
			this.fields.mode.value = name;

		switch (name) {
		case 'turbo':
			if (this.fields.manual)
				this.fields.manual.value = '100';
			this.setText(this.nodes.presetNote, texts.loadedToForm + ': ' + texts.turbo + '. ' + texts.saveApply);
			break;
		case 'manual':
			if (this.fields.manual)
				this.fields.manual.value = String(Math.round((this.runtime && this.runtime.manual_pwm != null) ? this.runtime.manual_pwm : 70));
			this.setText(this.nodes.presetNote, texts.loadedToForm + ': ' + texts.manual + ' / ' + this.formatPercent(this.readPreviewNumber(this.fields.manual, 70)) + '. ' + texts.saveApply);
			break;
		default:
			if (this.fields.on)
				this.fields.on.value = String(defaults.on);
			if (this.fields.off)
				this.fields.off.value = String(defaults.off);
			this.setText(this.nodes.presetNote, texts.loadedToForm + ': ' + texts.smart + ' / ' + defaults.on + this.degreeUnit + ' / ' + defaults.off + this.degreeUnit + '. ' + texts.saveApply);
			break;
		}

		this.syncFormState();
	},

	bindFields: function() {
		var manualField;

		this.fields = {
			enabled: this.mapNode.querySelector('[data-name="enabled"] input[type="checkbox"]'),
			mode: this.mapNode.querySelector('[data-name="mode"] select'),
			manual: this.mapNode.querySelector('[data-name="manual_pwm"] input'),
			on: this.mapNode.querySelector('[data-name="on_temp"] input'),
			off: this.mapNode.querySelector('[data-name="off_temp"] input')
		};

		if (this.fields.manual) {
			this.fields.manual.type = 'range';
			this.fields.manual.min = '0';
			this.fields.manual.max = '100';
			this.fields.manual.step = '1';
			manualField = this.mapNode.querySelector('[data-name="manual_pwm"] .cbi-value-field');
			if (manualField && !manualField.querySelector('.lf-range-output')) {
				this.manualOutput = E('span', { 'class': 'lf-range-output' }, [ this.formatPercent(toNumber(this.fields.manual.value)) ]);
				manualField.appendChild(this.manualOutput);
			} else if (manualField) {
				this.manualOutput = manualField.querySelector('.lf-range-output');
			}
		}

		if (this.fields.enabled)
			this.fields.enabled.addEventListener('change', this.syncFormState.bind(this));
		if (this.fields.mode)
			this.fields.mode.addEventListener('change', this.syncFormState.bind(this));
		if (this.fields.manual)
			this.fields.manual.addEventListener('input', this.syncFormState.bind(this));
		if (this.fields.on)
			this.fields.on.addEventListener('input', this.syncFormState.bind(this));
		if (this.fields.off)
			this.fields.off.addEventListener('input', this.syncFormState.bind(this));

		Array.prototype.forEach.call(this.root.querySelectorAll('.lf-preset'), function(node) {
			node.addEventListener('click', function(event) {
				this.pickProfile(event.currentTarget.getAttribute('data-preset'));
			}.bind(this));
		}, this);
	},

	drawFan: function(demand) {
		var canvas = this.nodes.canvas;
		if (!canvas || !canvas.getContext)
			return;

		var context = canvas.getContext('2d');
		var centerX = canvas.width / 2;
		var centerY = canvas.height / 2;
		var outerRadius = 94;
		var innerRadius = 58;
		var bladeColor = demand > 0.72 ? '#f79259' : (demand > 0.42 ? '#f3cf7c' : '#7de2b8');
		var glowColor = demand > 0.72 ? 'rgba(247, 146, 89, 0.22)' : (demand > 0.42 ? 'rgba(243, 207, 124, 0.22)' : 'rgba(125, 226, 184, 0.2)');

		context.clearRect(0, 0, canvas.width, canvas.height);
		context.save();
		context.translate(centerX, centerY);

		context.beginPath();
		context.arc(0, 0, outerRadius + 18, 0, Math.PI * 2, false);
		context.fillStyle = glowColor;
		context.fill();

		context.beginPath();
		context.arc(0, 0, outerRadius, 0, Math.PI * 2, false);
		context.fillStyle = 'rgba(7, 20, 26, 0.38)';
		context.fill();

		context.lineWidth = 12;
		context.strokeStyle = 'rgba(255, 255, 255, 0.12)';
		context.beginPath();
		context.arc(0, 0, outerRadius, 0, Math.PI * 2, false);
		context.stroke();

		context.lineCap = 'round';
		context.strokeStyle = bladeColor;
		context.beginPath();
		context.arc(0, 0, outerRadius, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * demand), false);
		context.stroke();

		for (var blade = 0; blade < 4; blade++) {
			context.save();
			context.rotate(this.rotorAngle + (blade * Math.PI / 2));
			context.beginPath();
			context.moveTo(0, -12);
			context.bezierCurveTo(58, -42, 48, -108, 0, -84);
			context.bezierCurveTo(-18, -74, -18, -24, 0, -12);
			context.closePath();
			context.fillStyle = bladeColor;
			context.fill();
			context.restore();
		}

		context.beginPath();
		context.arc(0, 0, innerRadius, 0, Math.PI * 2, false);
		context.fillStyle = 'rgba(10, 27, 33, 0.92)';
		context.fill();

		context.beginPath();
		context.arc(0, 0, 18, 0, Math.PI * 2, false);
		context.fillStyle = bladeColor;
		context.fill();

		context.restore();
	},

	deriveAnimationSpeed: function(preview, demand) {
		var rpm = this.runtime ? this.runtime.fan_rpm : null;

		if (rpm !== null) {
			if (rpm <= 0)
				return 0;

			return 0.12 + (clamp(rpm, 0, 6500) / 6500) * 1.33;
		}

		if (!preview.enabled)
			return 0.08;

		if (preview.mode === 'turbo')
			return 1.25;
		if (preview.mode === 'manual')
			return 0.22 + (demand * 0.95);
		if (this.runtime && this.runtime.state === 'active')
			return 0.55 + (demand * 0.8);
		if (this.runtime && this.runtime.state === 'transition')
			return 0.3 + (demand * 0.5);

		return 0.15 + (demand * 0.3);
	},

	animationLoop: function(timestamp) {
		if (!this.root || !document.body.contains(this.root))
			return;

		var preview = this.runtime ? this.getPreview() : { enabled: false, mode: 'smart', manual_pwm: 70, on: null, off: null };
		var demand = this.runtime ? this.deriveDemand(preview) : 0;
		var speed = this.deriveAnimationSpeed(preview, demand);

		if (!this.lastTick)
			this.lastTick = timestamp;

		this.rotorAngle += ((timestamp - this.lastTick) / 1000) * speed * Math.PI;
		this.lastTick = timestamp;
		this.drawFan(demand);
		this.requestFrame(this.animationLoop.bind(this));
	},

	pollStatus: function() {
		return L.resolveDefault(callGetStatus(), null).then(function(status) {
			if (status)
				this.updateRuntime(status);
		}.bind(this));
	},

	renderDashboardShell: function(status) {
		var shell = E('div', { 'class': 'lf-dashboard-shell' }, [
			E('style', {}, dashboardStyle)
		]);
		var dashboard = E('div', {
			'class': 'cbi-section-node lf-dashboard',
			'id': 'lf-dashboard',
			'data-zone': status.zone || '--',
			'data-type': status.thermal_type || '--',
			'data-is-bpi-r4': status.is_bpi_r4 ? '1' : '0'
		});
		var heroText = status.is_bpi_r4 ? texts.bpiHero : texts.genericHero;
		var primaryChip = escapeHtml(status.model_name || texts.currentDevice);
		var secondaryChip = status.board_name ? '<span class="lf-chip lf-chip-muted">' + escapeHtml(status.board_name) + '</span>' : '';
		var sourceText = escapeHtml((status.hwmon_name || '--') + ' / ' + (status.zone || '--'));

		dashboard.innerHTML = '' +
			'<div class="lf-hero">' +
				'<div class="lf-copy">' +
					'<div class="lf-eyebrow">' + escapeHtml(_('Adaptive Fan Profile')) + '</div>' +
					'<h3>' + escapeHtml(_('Live Cooling Dashboard')) + '</h3>' +
					'<p>' + escapeHtml(heroText) + '</p>' +
					'<div class="lf-chip-row">' +
						'<span class="lf-chip">' + primaryChip + '</span>' +
						secondaryChip +
						'<span class="lf-chip lf-chip-alert" id="lf-support-chip" style="display:none"></span>' +
						'<span class="lf-chip lf-runtime-badge" id="lf-runtime-badge" data-state="disabled">' + escapeHtml(texts.monitoringState) + '</span>' +
					'</div>' +
				'</div>' +
				'<div class="lf-visual">' +
					'<div class="lf-orb">' +
						'<canvas id="lf-fan-canvas" width="260" height="260"></canvas>' +
						'<div class="lf-temp-readout">' +
							'<div class="lf-temp-number" id="lf-temp-number">--</div>' +
							'<div class="lf-temp-unit">' + escapeHtml(String.fromCharCode(176) + 'C') + '</div>' +
							'<div class="lf-temp-caption" id="lf-temp-caption">' + escapeHtml(texts.unavailable) + '</div>' +
						'</div>' +
					'</div>' +
					'<div class="lf-demand">' +
						'<div class="lf-demand-row">' +
							'<span>' + escapeHtml(texts.currentDuty) + '</span>' +
							'<strong id="lf-demand-value">--%</strong>' +
						'</div>' +
						'<div class="lf-demand-bar"><div id="lf-demand-fill"></div></div>' +
					'</div>' +
				'</div>' +
			'</div>' +
			'<div class="lf-metrics">' +
				'<div class="lf-metric"><div class="lf-metric-label">' + escapeHtml(_('CPU temperature')) + '</div><div class="lf-metric-value" id="lf-metric-cpu">--</div></div>' +
				'<div class="lf-metric"><div class="lf-metric-label">' + escapeHtml(_('Fan speed')) + '</div><div class="lf-metric-value" id="lf-metric-fan">--</div></div>' +
				'<div class="lf-metric"><div class="lf-metric-label">' + escapeHtml(_('Current PWM duty')) + '</div><div class="lf-metric-value" id="lf-metric-pwm">--</div></div>' +
				'<div class="lf-metric"><div class="lf-metric-label">' + escapeHtml(_('Control mode')) + '</div><div class="lf-metric-value" id="lf-metric-mode">--</div></div>' +
			'</div>' +
			'<div class="lf-ladder-card">' +
				'<div class="lf-ladder-head">' +
					'<h4>' + escapeHtml(_('Thermal ladder')) + '</h4>' +
					'<span class="lf-source-pill" id="lf-source-label">' + sourceText + '</span>' +
				'</div>' +
				'<div class="lf-ladder-track">' +
					'<div class="lf-marker" id="lf-marker-off"></div>' +
					'<div class="lf-marker lf-marker-current" id="lf-marker-current"></div>' +
					'<div class="lf-marker" id="lf-marker-on"></div>' +
					'<div class="lf-marker" id="lf-marker-next"></div>' +
				'</div>' +
				'<div class="lf-ladder-scale">' +
					'<div class="lf-scale-item"><span>' + escapeHtml(_('Fan stop temperature')) + '</span><strong id="lf-scale-off">--</strong></div>' +
					'<div class="lf-scale-item"><span>' + escapeHtml(_('Current temperature')) + '</span><strong id="lf-scale-current">--</strong></div>' +
					'<div class="lf-scale-item"><span>' + escapeHtml(_('Fan start temperature')) + '</span><strong id="lf-scale-on">--</strong></div>' +
					'<div class="lf-scale-item"><span>' + escapeHtml(_('Next trip ceiling')) + '</span><strong id="lf-scale-next">--</strong></div>' +
				'</div>' +
			'</div>' +
			'<div class="lf-grid">' +
				'<div class="lf-card">' +
					'<h4>' + escapeHtml(_('Operating profiles')) + '</h4>' +
					'<p>' + escapeHtml(_('Use these shortcuts to load Turbo, Smart or Manual targets into the form below before Save & Apply.')) + '</p>' +
					'<div class="lf-preset-list">' +
						'<button type="button" class="lf-preset" data-preset="turbo">' + escapeHtml(_('Turbo mode')) + '</button>' +
						'<button type="button" class="lf-preset" data-preset="smart">' + escapeHtml(_('Smart mode')) + '</button>' +
						'<button type="button" class="lf-preset" data-preset="manual">' + escapeHtml(_('Manual mode')) + '</button>' +
					'</div>' +
					'<p class="lf-note" id="lf-preset-note">' + escapeHtml(texts.saveApply) + '</p>' +
				'</div>' +
				'<div class="lf-card">' +
					'<h4>' + escapeHtml(_('Runtime insight')) + '</h4>' +
					'<div class="lf-insights" id="lf-insights"><p class="lf-insight">' + escapeHtml(texts.telemetryWaiting) + '</p></div>' +
				'</div>' +
				'<div class="lf-card">' +
					'<h4>' + escapeHtml(_('Current config')) + '</h4>' +
					'<div class="lf-config-grid">' +
						'<div class="lf-config-item"><span>' + escapeHtml(_('Enabled in UCI')) + '</span><strong id="lf-config-enabled">--</strong></div>' +
						'<div class="lf-config-item"><span>' + escapeHtml(_('Control mode')) + '</span><strong id="lf-config-mode">--</strong></div>' +
						'<div class="lf-config-item"><span>' + escapeHtml(_('Manual target')) + '</span><strong id="lf-config-manual">--</strong></div>' +
						'<div class="lf-config-item"><span>' + escapeHtml(_('Runtime fan speed')) + '</span><strong id="lf-config-rpm">--</strong></div>' +
						'<div class="lf-config-item"><span>' + escapeHtml(_('Smart start threshold')) + '</span><strong id="lf-config-on">--</strong></div>' +
						'<div class="lf-config-item"><span>' + escapeHtml(_('Smart stop threshold')) + '</span><strong id="lf-config-off">--</strong></div>' +
					'</div>' +
				'</div>' +
			'</div>';

		shell.appendChild(dashboard);
		return shell;
	},

	collectNodes: function() {
		this.nodes = {
			runtimeBadge: this.root.querySelector('#lf-runtime-badge'),
			supportChip: this.root.querySelector('#lf-support-chip'),
			tempNumber: this.root.querySelector('#lf-temp-number'),
			tempCaption: this.root.querySelector('#lf-temp-caption'),
			demandValue: this.root.querySelector('#lf-demand-value'),
			demandFill: this.root.querySelector('#lf-demand-fill'),
			metricCpu: this.root.querySelector('#lf-metric-cpu'),
			metricFan: this.root.querySelector('#lf-metric-fan'),
			metricPwm: this.root.querySelector('#lf-metric-pwm'),
			metricMode: this.root.querySelector('#lf-metric-mode'),
			markerOff: this.root.querySelector('#lf-marker-off'),
			markerCurrent: this.root.querySelector('#lf-marker-current'),
			markerOn: this.root.querySelector('#lf-marker-on'),
			markerNext: this.root.querySelector('#lf-marker-next'),
			scaleOff: this.root.querySelector('#lf-scale-off'),
			scaleCurrent: this.root.querySelector('#lf-scale-current'),
			scaleOn: this.root.querySelector('#lf-scale-on'),
			scaleNext: this.root.querySelector('#lf-scale-next'),
			insights: this.root.querySelector('#lf-insights'),
			presetNote: this.root.querySelector('#lf-preset-note'),
			configEnabled: this.root.querySelector('#lf-config-enabled'),
			configMode: this.root.querySelector('#lf-config-mode'),
			configManual: this.root.querySelector('#lf-config-manual'),
			configRpm: this.root.querySelector('#lf-config-rpm'),
			configOn: this.root.querySelector('#lf-config-on'),
			configOff: this.root.querySelector('#lf-config-off'),
			sourceLabel: this.root.querySelector('#lf-source-label'),
			canvas: this.root.querySelector('#lf-fan-canvas')
		};
	},

	updateRuntimeBadge: function() {
		if (!this.runtime)
			return;

		var state = this.runtime.supported ? (this.runtime.state || 'disabled') : 'unsupported';
		var label = texts.disabled;
		var zoneName = this.runtime.zone || '--';
		var thermalType = this.runtime.thermal_type || '--';
		var sourceText = (this.runtime.hwmon_name || '--') + ' / ' + zoneName;

		if (!this.runtime.supported)
			label = texts.unsupported;
		else if (state === 'active')
			label = texts.active;
		else if (state === 'transition')
			label = texts.transition;
		else if (state === 'standby')
			label = texts.standby;

		this.root.setAttribute('data-zone', zoneName);
		this.root.setAttribute('data-type', thermalType);
		this.root.setAttribute('data-is-bpi-r4', this.runtime.is_bpi_r4 ? '1' : '0');

		this.nodes.runtimeBadge.setAttribute('data-state', state);
		this.setText(this.nodes.runtimeBadge, label);
		this.setText(this.nodes.tempNumber, this.formatReadout(this.runtime.zone_temp));
		this.setText(this.nodes.tempCaption, this.runtime.zone_temp !== null ? (this.modeLabel(this.runtime.mode) + ' / ' + thermalType) : (this.runtime.error || texts.unavailable));
		this.setText(this.nodes.sourceLabel, sourceText);

		if (!this.runtime.mode_supported && this.runtime.supported)
			this.nodes.supportChip.style.display = 'inline-flex';
		else if (!this.runtime.supported)
			this.nodes.supportChip.style.display = 'inline-flex';
		else
			this.nodes.supportChip.style.display = 'none';

		this.setText(this.nodes.supportChip, this.runtime.supported ? texts.modeUnsupportedHint : texts.unsupportedHint);
	},

	updateRuntime: function(data) {
		this.runtime = normalizeStatus(data);
		this.updateRuntimeBadge();
		this.syncFormState();
	},

	render: function(data) {
		var initialStatus = normalizeStatus(data[1]);
		var defaults = recommendedSmartWindow(initialStatus);
		var m = new form.Map('luci-fan', _('Fan Control'), _('Configure Smart, Turbo and Manual fan profiles for pwm-fan capable boards such as the BPI-R4. The live panel reads CPU temperature, PWM duty and tachometer feedback over ubus.'));
		var s = m.section(form.TypedSection, 'luci-fan', _('Profile Settings'));
		var o;
		var dashboard = this.renderDashboardShell(initialStatus);

		s.anonymous = true;
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', _('Enable fan service'));
		o.rmempty = false;
		o.default = '0';
		o.description = _('Start the fan daemon on Save & Apply. Smart mode follows CPU temperature, Turbo holds 100%, and Manual applies the slider target on pwm-fan capable boards.');

		o = s.option(form.ListValue, 'mode', _('Control mode'));
		o.rmempty = false;
		o.default = initialStatus.mode || 'smart';
		o.value('smart', _('Smart'));
		o.value('turbo', _('Turbo'));
		o.value('manual', _('Manual'));
		o.description = _('Turbo and Manual require pwm-fan hwmon support. Smart mode also falls back to writable thermal trip control on older targets.');

		o = s.option(form.Value, 'manual_pwm', _('Manual PWM target'));
		o.datatype = 'and(uinteger,min(0),max(100))';
		o.placeholder = String(initialStatus.manual_pwm != null ? Math.round(initialStatus.manual_pwm) : 70);
		o.default = String(initialStatus.manual_pwm != null ? Math.round(initialStatus.manual_pwm) : 70);
		o.description = _('Duty target in percent for Manual mode. 0 turns the fan off, 100 drives the maximum PWM value.');
		o.depends('mode', 'manual');

		o = s.option(form.Value, 'on_temp', _('Smart start threshold'));
		o.datatype = 'and(uinteger,min(6),max(120))';
		o.placeholder = String(defaults.on);
		o.default = String(defaults.on);
		o.description = _('Temperature in Celsius where Smart mode ramps the fan into a clearly audible cooling state.');
		o.depends('mode', 'smart');
		o.validate = function(sectionId, value) {
			var offOption = this.map.lookupOption('off_temp', sectionId);
			var offValue = offOption && offOption[0] ? parseInt(offOption[0].formvalue(sectionId), 10) : null;
			var startValue = parseInt(value, 10);

			if (isNaN(startValue))
				return _('Smart start threshold must be a valid integer.');
			if (!isNaN(offValue) && startValue <= offValue)
				return _('Smart start threshold must be greater than the stop threshold.');

			return true;
		};

		o = s.option(form.Value, 'off_temp', _('Smart stop threshold'));
		o.datatype = 'and(uinteger,min(5),max(119))';
		o.placeholder = String(defaults.off);
		o.default = String(defaults.off);
		o.description = _('Temperature in Celsius where Smart mode drops back to zero duty. Keep it at least 3 C below the start threshold.');
		o.depends('mode', 'smart');
		o.validate = function(sectionId, value) {
			var onOption = this.map.lookupOption('on_temp', sectionId);
			var onValue = onOption && onOption[0] ? parseInt(onOption[0].formvalue(sectionId), 10) : null;
			var stopValue = parseInt(value, 10);

			if (isNaN(stopValue))
				return _('Smart stop threshold must be a valid integer.');
			if (!isNaN(onValue) && stopValue >= onValue)
				return _('Smart stop threshold must stay below the start threshold.');
			return true;
		};

		o = s.option(form.Value, 'poll_interval', _('Polling interval'));
		o.datatype = 'and(uinteger,min(1),max(30))';
		o.placeholder = String(initialStatus.poll_interval != null ? Math.round(initialStatus.poll_interval) : 3);
		o.default = String(initialStatus.poll_interval != null ? Math.round(initialStatus.poll_interval) : 3);
		o.description = _('Fan daemon loop interval in seconds. Lower values react faster, higher values reduce churn.');

		return m.render().then(function(mapNode) {
			this.mapNode = mapNode;
			this.root = dashboard.querySelector('#lf-dashboard');
			this.collectNodes();
			this.bindFields();
			this.updateRuntime(initialStatus);
			this.requestFrame(this.animationLoop.bind(this));
			poll.add(this.pollStatus.bind(this));
			return E('div', { 'class': 'lf-page' }, [ dashboard, mapNode ]);
		}.bind(this));
	}
});