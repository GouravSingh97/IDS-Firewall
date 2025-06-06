# imports
import json
import socket
import logging
import threading
from collections import Counter
from datetime import datetime, timedelta
from flask import Flask, request, render_template, jsonify, url_for, redirect

'''
    =======================================
                  Globals
    =======================================
'''

# make flask instance
app = Flask('Firewall & IDS')  

# {client_address : requests_within_last_minute}
client_activity = {}

# blocked ip addresses
blocked_clients = []

# load firewall configuration
firewall_config = {}
with open('static/json/firewall_config.json') as f:
    firewall_config = json.load(f)

# load ids configuration
ids_config = {}
with open('static/json/ids_config.json') as f:
    ids_config = json.load(f)

'''
    =======================================
          Configure server logging
    =======================================
'''

# setups up terminal and file logging
def _logger():
    # logs to terminal
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    console_handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(message)s')
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # logs to a file
    _logs = logging.getLogger('logs')
    logs_handler = logging.FileHandler('utils/logfile') 
    logs_handler.setLevel(logging.INFO)
    login_formatter = logging.Formatter('%(asctime)s - %(message)s')
    logs_handler.setFormatter(login_formatter)
    _logs.addHandler(logs_handler)


# Handles logging client traffic/messages
def log_message(msg):
    _newlog = logging.getLogger('logs')
    _newlog.info(
        f"{msg}"
    )


'''
    =======================================
            Configure additional ports
    =======================================
'''

# Handle UDP connections
def udp_server():
    global client_activity

    # setup UDP socket
    udp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    udp_socket.bind(('0.0.0.0', 9001))  
    
    print("UDP connection: listening on port 9001")
    
    # view server's open udp ports: sudo nmap -sU localhost
    while True:
        data, (client, _) = udp_socket.recvfrom(1024)
        msg = f"Client: {client}, sent a UDP packet"
        log_message(msg)        

        # track requests
        rate_limit(client, "UDP port")

        # update client's suspicion type
        client_activity[client]["type"] = f"Unauthorized access attempt: UDP packet sent to port 9001"
        client_activity[client]["timestamp"] = datetime.now()
    

'''
    =======================================
            Handle HTTP routes 
    =======================================
'''

# Home page
@app.route('/')
def home():
    # track client requests
    client = request.remote_addr
    rate_limit(client, "home")
    result = restrict_headers(client, 'home', request)

    # log successful access
    if result:
        msg = f'Client: {client}, just accessed the home page'
        log_message(msg) 

    return render_template('home.html')


# Page A
@app.route('/a')
def route_a():
    # track client requests
    client = request.remote_addr
    rate_limit(client, "a")
    result = restrict_headers(client, 'a', request)

    # log access
    if result:
        msg = f'Client: {client}, just accessed page A'
        log_message(msg) 

    return render_template('route_a.html')


# Page B
@app.route('/b')
def route_b():
    # track client requests
    client = request.remote_addr
    rate_limit(client, "b")
    result = restrict_headers(client, 'b', request)

    # log access
    if result:
        msg = f'Client: {client}, just accessed page B'
        log_message(msg) 

    return render_template('route_b.html')


# Page C
@app.route('/c')
def route_c():
    # track client requests
    client = request.remote_addr
    rate_limit(client, "c")
    result = restrict_headers(client, 'c', request)

    # log access
    if result:
        msg = f'Client: {client}, just accessed page C'
        log_message(msg) 

    return render_template('route_c.html')


# Error page
@app.route('/error')
def error():
    # log access
    client = request.remote_addr
    msg = f'Client: {client}, just accessed the error page'
    log_message(msg) 
    
    return render_template('error.html')


'''
    =======================================
            Server Firewall and IDS
    =======================================
'''

app.add_url_rule('/', 'home', home, methods=['GET'] + firewall_config["denied_headers"][0]["methods"])
app.add_url_rule('/a', 'route_a', route_a, methods=['GET'] + firewall_config["denied_headers"][0]["methods"])
app.add_url_rule('/b', 'route_b', route_b, methods=['GET'] + firewall_config["denied_headers"][0]["methods"])
app.add_url_rule('/c', 'route_c', route_c, methods=['GET'] + firewall_config["denied_headers"][0]["methods"])

# handle blocking addresses
@app.before_request
def restrict_ips():
    global blocked_clients

    client_ip = request.remote_addr
    if request.endpoint != 'error' and client_ip in blocked_clients:
        return redirect(url_for('error'))


# handle rate limiting
def rate_limit(client, page):
    global client_activity
    global blocked_clients

    # skip host client
    if client == "127.0.0.1":
        return
    
    logs = 'utils/logfile'

    # allowed requests per minute
    rate_limit_window = 60

    # calculate the time threshold (1 minute ago)
    window = datetime.now() - timedelta(seconds=rate_limit_window)

    # check if a minute has elapsed since the last update for the client
    if client in client_activity:
        last_update_time = client_activity[client]["timestamp"]
        if datetime.now() - last_update_time >= timedelta(seconds=rate_limit_window):
            # reset request count and pages array for the client
            client_activity[client] = {"requests": 0, "timestamp": datetime.now(), "pages": []}

    # read logfile and count website requests from the same client address within the time window
    _requests = 0
    with open(logs, 'r') as log_file:
        for line in log_file:
             if f"Client: {client}" in line:
                timestamp_str, client_info = line.split(' - ')
                timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S,%f')
                if timestamp > window:
                    _requests += 1

    # update client_activity dictionary
    if client not in client_activity:
        client_activity[client] = {"requests": 1, "timestamp": datetime.now(), "pages": [page]}
    else:
        client_activity[client]["requests"] += 1
        client_activity[client]["timestamp"] = datetime.now()
        client_activity[client]["pages"].append(page)

    # check if client exceed low page request threshold
    if client_activity[client]["requests"] >= ids_config['thresholds']['low']:
        if "type" not in client_activity[client]:
            client_activity[client]["type"] = ids_config["rules"][0]["pattern"]

    # check if client exceed high page request threshold
    if client_activity[client]["requests"] >= ids_config['thresholds']['high']:
        if client not in blocked_clients:
            blocked_clients.append(client)
            del client_activity[client]

    
# handle firewall headers
def restrict_headers(client, page, request):    
    global client_activity

    # check if any request uses the denied HTTP methods
    denied_methods = firewall_config["denied_headers"][0]["methods"]
    
    if request.method in denied_methods:
        msg = f'Access attempt from client {client} to page {page} using {request.method} method'
        log_message(msg)

        # update clients suspicion type
        if client not in client_activity or "type" not in client_activity[client]:
            client_activity[client]["type"] = f"denied method ({request.method})"     
            client_activity[client]["timestamp"] = datetime.now()

        return False
    
    _flaga = firewall_config["denied_headers"][0]["flags"][0]
    _flagb = firewall_config["denied_headers"][0]["flags"][1]

    if _flaga in request.headers or _flagb in request.headers:
        msg = f'Suspicious access attempt from client {client}, headers contain Authorization or Forwarded'
        log_message(msg)

        # update clients suspicion type
        if client not in client_activity or "type" not in client_activity[client]:
            client_activity[client]["type"] = "suspicious headers (contains 'Authorization' or 'Forwarded')"
            client_activity[client]["timestamp"] = datetime.now()

        return False
    
    # check packet length if request.content_length exists and is not None
    if request.content_length is not None and int(request.content_length) >= int(firewall_config["denied_headers"][0]["length"]):
        msg = f'Client {client} attempted sending a packet length of {request.content_length} to page {page}'
        log_message(msg)

        # update clients suspicion type
        if client not in client_activity or "type" not in client_activity[client]:
            client_activity[client]["type"] = f"attempted sending a packet length of {request.content_length}"
            client_activity[client]["timestamp"] = datetime.now()
        
        return False

    return True
    

'''
    =======================================
              Terminal Back-end
    =======================================
'''

# returns the output of the specified command
def terminal_output(command):
    global client_activity
    global blocked_clients

    # initialize the result dictionary
    result = {
        'message' : ''
    }

    # Get information from logged server content
    match command:
        # shows the help menu for the terminal
        case "help":
            help_menu = '''
            =================================================================================
                                      𝗙𝗜𝗥𝗘𝗪𝗔𝗟𝗟 & 𝗜𝗗𝗦 𝗠𝗘𝗡𝗨                            
            $ >
            $ : [help]       Displays terminal command information
            $ : [clear]      Clears the terminal screen
            $ : [traffic]    Shows server traffic statistics
            
            $ : [alerts]              Shows statistics for each alert type
            $ : [alerts suspicious]   Show clients with suspicious activity
            $ : [alerts blacklist]    Show clients that have been blacklisted

            $ : [move all suspicious blacklist]  Moves all clients from one list to another

            $ : [remove all suspicious] Removes all clients from the given alert list
            $ : [remove all blacklist]  Removes all clients from the given alert list
        
            $ : [firewall]  Shows the current firewall configuration
            $ : [ids]       Shows the current IDS configuration
            =================================================================================
            '''
            result['message'] = help_menu
        
        # shows statistics for server traffic
        case "traffic":
            # calculate total page statistics across all clients
            page_statistics = {}
            for data in client_activity.values():
                for page, count in Counter(data.get("pages", [])).items():
                    page_statistics[page] = page_statistics.get(page, 0) + count
            
            # construct the traffic message
            traffic = "\n============================================\n"
            traffic += "_________________Traffic____________________\n"
            traffic += "$ : Requests made within the last minute\n"
            traffic += "$ >\n"
            
            for page, total_requests in page_statistics.items():
                if page == 'UDP port':
                    traffic += f"{total_requests} requests made to the {page}\n"
                else:
                    traffic += f"{total_requests} requests made to the {page} route\n"

            traffic += "============================================\n"
            result['message'] = traffic

        # shows statistics for alert types
        case "alerts":            
            total_suspicious = len([client for client, data in client_activity.items() if "type" in data])
            total_blacklist = len(blocked_clients)
            
            alert_stats = f'Total Suspicious Alerts: {total_suspicious}\nTotal Blacklist Alerts: {total_blacklist}'
            result['message'] = alert_stats

        # shows the clients that've been marked as suspicious
        case "alerts suspicious":
            msg_body = ""

            for client, data in client_activity.items():               
                if "type" in data:
                    msg_body += f'[Suspicion Alert]: Client {client} is showcasing suspicious behavior, {data["type"]}\n'
            
            if msg_body == "":
                msg_body = 'No suspicious activities to report'

            result['message'] = msg_body

        # shows the clients in blocked_clients
        case "alerts blacklist":
            msg_body = ""
            for _ip in blocked_clients:
                msg = f'[Blacklist Alert]: Client {_ip} has been blacklisted\n'    
                msg_body += msg

            if msg_body == "":
                msg_body = f'No blocked clients to report'

            result['message'] = msg_body

        # moves all clients from suspicious to blacklist
        case "move all suspicious blacklist":
            # Create a copy of client_activity to avoid modifying it while iterating
            for client, data in list(client_activity.items()):
                if "type" in data and client not in blocked_clients:
                    blocked_clients.append(client)

            result['message'] = "All suspicious clients have been moved to the blacklist."

            # Remove clients from the suspicious list if they are also in blocked_clients
            for client in blocked_clients:
                if client in client_activity:
                    del client_activity[client]

        # resets all clients, 'requests' value from client_activity
        case "remove all suspicious":
            client_activity = {client: data for client, data in client_activity.items() if "type" not in data}
            result['message'] = "All suspicious clients have been removed."

        # removes all clients from blocked_clients 
        case "remove all blacklist":
            blocked_clients = []
            result['message'] = "All clients from the blacklist have been removed."

        # show the Firewall configuration
        case "firewall":
            # Format the firewall configuration JSON into a string with custom indentation
            custom_indent = '    '
            firewall_message = f'''
            \n============================================
                      𝗙𝗶𝗿𝗲𝘄𝗮𝗹𝗹 𝗖𝗼𝗻𝗳𝗶𝗴𝘂𝗿𝗮𝘁𝗶𝗼𝗻         
            $ > Allowed Traffic: {json.dumps(firewall_config.get("allowed_traffic", "N/A"), indent=custom_indent)}
            $ > Denied Headers: {json.dumps(firewall_config.get("denied_headers", "N/A"), indent=custom_indent)}
            ============================================
            '''
            result['message'] = firewall_message

        # show the IDS configuration
        case "ids":
            # Format the IDS configuration JSON into a string with custom indentation
            custom_indent = '    '
            ids_message = f'''
            \n============================================
                        𝗜𝗗𝗦  𝗖𝗼𝗻𝗳𝗶𝗴𝘂𝗿𝗮𝘁𝗶𝗼𝗻           
            $ > Thresholds: {json.dumps(ids_config.get("thresholds", "N/A"), indent=custom_indent)}
            $ > Rules: {json.dumps(ids_config.get("rules", "N/A"), indent=custom_indent)}
            ============================================
            '''
            result['message'] = ids_message

        # default error case
        case _:
            result['message'] = "invalid command entered, type 'help' for the list of commands"
        
    return jsonify(result)



# handle terminal command submissions
@app.route('/terminal_submit', methods=['POST'])
def terminal():
    # get terminal input
    command = request.form['terminal_input']
    return terminal_output(command)


'''
    =======================================
                   Start
    =======================================
'''

if __name__ == '__main__':
    # setup packet/client logging
    _logger()

    # udp socket port thread
    udp_thread = threading.Thread(target=udp_server)
    udp_thread.start()

    # start web app/server
    app.run(port = 9000, debug = False)

    # server with self-signed SSL certificate
    # app.run(ssl_context=('certificates/cert.pem', 'certificates/key.pem'), port=9000, debug=True)