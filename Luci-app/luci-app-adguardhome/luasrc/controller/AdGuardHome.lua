module("luci.controller.AdGuardHome",package.seeall)
local fs=require"nixio.fs"
local http=require"luci.http"
local sys=require"luci.sys"
local util=require"luci.util"
local uci=require"luci.model.uci".cursor()

local function trim(value)
	if not value then
		return ""
	end

	return (value:gsub("^%s+", ""):gsub("%s+$", ""))
end

local function get_option(option, default)
	return uci:get("AdGuardHome", "AdGuardHome", option) or default
end

local function resolve_core_version(binpath)
	if not fs.access(binpath) then
		return ""
	end

	local binmtime = tonumber(get_option("binmtime", "0")) or 0
	local version = trim(get_option("version", ""))
	local testtime = fs.stat(binpath, "mtime") or 0

	if testtime ~= binmtime or version == "" then
		local detected = trim(sys.exec(util.shellquote(binpath) .. " -c /dev/null --check-config 2>&1 | grep -m 1 -E 'v[0-9.]+' -o"))
		version = detected
		if version ~= "" then
			uci:set("AdGuardHome", "AdGuardHome", "version", version)
			uci:set("AdGuardHome", "AdGuardHome", "binmtime", testtime)
			uci:save("AdGuardHome")
		end
	end

	return version
	end

local function resolve_dns_port(configpath)
	if not fs.access(configpath) then
		return ""
	end

	return trim(sys.exec("awk '/^[[:space:]]*port:/{print $2; exit}' " .. util.shellquote(configpath) .. " 2>/dev/null"))
end
function index()
entry({"admin", "services", "AdGuardHome"},alias("admin", "services", "AdGuardHome", "base"),_("AdGuard Home"), 10).dependent = true
entry({"admin","services","AdGuardHome","base"},cbi("AdGuardHome/base"),_("Base Setting"),1).leaf = true
entry({"admin","services","AdGuardHome","log"},form("AdGuardHome/log"),_("Log"),2).leaf = true
entry({"admin","services","AdGuardHome","manual"},cbi("AdGuardHome/manual"),_("Manual Config"),3).leaf = true
entry({"admin","services","AdGuardHome","status"},call("act_status")).leaf=true
entry({"admin", "services", "AdGuardHome", "check"}, call("check_update"))
entry({"admin", "services", "AdGuardHome", "doupdate"}, call("do_update"))
entry({"admin", "services", "AdGuardHome", "getlog"}, call("get_log"))
entry({"admin", "services", "AdGuardHome", "dodellog"}, call("do_dellog"))
entry({"admin", "services", "AdGuardHome", "reloadconfig"}, call("reload_config"))
entry({"admin", "services", "AdGuardHome", "gettemplateconfig"}, call("get_template_config"))
end 
function get_template_config()
	local b
	local d=""
	for cnt in io.lines("/tmp/resolv.conf.auto") do
		b=string.match (cnt,"^[^#]*nameserver%s+([^%s]+)$")
		if (b~=nil) then
			d=d.."  - "..b.."\n"
		end
	end
	local f=io.open("/usr/share/AdGuardHome/AdGuardHome_template.yaml", "r")
	if not f then
		http.prepare_content("text/plain; charset=utf-8")
		http.write("")
		return
	end
	local tbl = {}
	local a=""
	while (1) do
    	a=f:read("*l")
		if (a=="#bootstrap_dns") then
			a=d
		elseif (a=="#upstream_dns") then
			a=d
		elseif (a==nil) then
			break
		end
		table.insert(tbl, a)
	end
	f:close()
	http.prepare_content("text/plain; charset=utf-8")
	http.write(table.concat(tbl, "\n"))
end
function reload_config()
	fs.remove("/tmp/AdGuardHometmpconfig.yaml")
	http.prepare_content("application/json")
	http.write('')
end
function act_status()
	local e={}
	local binpath = get_option("binpath", "/etc/config/adGuardConfig/AdGuardHome")
	local configpath = get_option("configpath", "/etc/config/adGuardConfig/AdGuardHome.yaml")
	local workdir = get_option("workdir", "/etc/config/adGuardConfig/workspace")
	local logfile = get_option("logfile", "")
	local httpport = get_option("httpport", "3000")
	local redirect_mode = get_option("redirect", "none")

	e.enabled = get_option("enabled", "0") == "1"
	e.running = sys.call("pgrep -f " .. util.shellquote(binpath) .. " >/dev/null") == 0
	e.redirect = (fs.readfile("/var/run/AdGredir") == "1")
	e.redirect_mode = redirect_mode
	e.core_ready = fs.access(binpath)
	e.config_ready = fs.access(configpath)
	e.workdir_ready = fs.access(workdir)
	e.log_ready = logfile == "" or logfile == "syslog" or fs.access(logfile)
	e.update_running = fs.access("/var/run/update_core")
	e.config_dirty = fs.access("/tmp/AdGuardHometmpconfig.yaml")
	e.verbose = get_option("verbose", "0") == "1"
	e.waitonboot = get_option("waitonboot", "1") == "1"
	e.httpport = httpport
	e.dns_port = resolve_dns_port(configpath)
	e.version = resolve_core_version(binpath)
	e.binpath = binpath
	e.configpath = configpath
	e.workdir = workdir
	e.logfile = logfile
	http.prepare_content("application/json")
	http.write_json(e)
end
function do_update()
	fs.writefile("/var/run/lucilogpos","0")
	http.prepare_content("application/json")
	http.write('')
	local arg
	if luci.http.formvalue("force") == "1" then
		arg="force"
	else
		arg=""
	end
	if fs.access("/var/run/update_core") then
		if arg=="force" then
			luci.sys.exec("kill $(pgrep /usr/share/AdGuardHome/update_core.sh) ; sh /usr/share/AdGuardHome/update_core.sh "..arg.." >/tmp/AdGuardHome_update.log 2>&1 &")
		end
	else
		luci.sys.exec("sh /usr/share/AdGuardHome/update_core.sh "..arg.." >/tmp/AdGuardHome_update.log 2>&1 &")
	end
end
function get_log()
	local logfile=uci:get("AdGuardHome","AdGuardHome","logfile")
	if (logfile==nil) then
		http.write("no log available\n")
		return
	elseif (logfile=="syslog") then
		if not fs.access("/var/run/AdGuardHomesyslog") then
			luci.sys.exec("(/usr/share/AdGuardHome/getsyslog.sh &); sleep 1;")
		end
		logfile="/tmp/AdGuardHometmp.log"
		fs.writefile("/var/run/AdGuardHomesyslog","1")
	elseif not fs.access(logfile) then
		http.write("")
		return
	end
	http.prepare_content("text/plain; charset=utf-8")
	local fdp
	if fs.access("/var/run/lucilogreload") then
		fdp=0
		fs.remove("/var/run/lucilogreload")
	else
		fdp=tonumber(fs.readfile("/var/run/lucilogpos")) or 0
	end
	local f=io.open(logfile, "r")
	if not f then
		http.write("")
		return
	end
	f:seek("set",fdp)
	local a=f:read(2048000) or ""
	fdp=f:seek()
	fs.writefile("/var/run/lucilogpos",tostring(fdp))
	f:close()
	http.write(a)
end
function do_dellog()
	local logfile=uci:get("AdGuardHome","AdGuardHome","logfile")
	if logfile and logfile ~= "" and logfile ~= "syslog" then
		fs.writefile(logfile,"")
	end
	http.prepare_content("application/json")
	http.write('')
end
function check_update()
	http.prepare_content("text/plain; charset=utf-8")
	if not fs.access("/tmp/AdGuardHome_update.log") then
		if fs.access("/var/run/update_core") then
			http.write("")
		else
			http.write("\0")
		end
		return
	end
	local fdp=tonumber(fs.readfile("/var/run/lucilogpos")) or 0
	local f=io.open("/tmp/AdGuardHome_update.log", "r")
	if not f then
		if fs.access("/var/run/update_core") then
			http.write("")
		else
			http.write("\0")
		end
		return
	end
	f:seek("set",fdp)
	local a=f:read(2048000) or ""
	fdp=f:seek()
	fs.writefile("/var/run/lucilogpos",tostring(fdp))
	f:close()
if fs.access("/var/run/update_core") then
	http.write(a)
else
	http.write(a.."\0")
end
end
