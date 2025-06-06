# imports
import time
import socket
import random
import threading
import http.client
from termcolor import colored


class Simulate():
    def __init__(self):
        self.url = 'http://127.0.0.1:9000'
        self.routes = [
            '/',
            '/a',
            '/b',
            '/c',
        ]
	
        # list of proxies
        self.proxies = [line.strip() for line in open('proxies', 'r')]
        self.clients = [ip for ip in self.proxies if not ip.endswith('.255')]
        self.parse()


    # splitup clients list
    def parse(self):
        # Calculate the midpoint to evenly split the list
        midpoint = len(self.clients) // 2

        # clients for basic crawling
        self.clients_a = self.clients[:midpoint]

        # clients for random crawling (some basic & some intensive) 
        self.clients_b = self.clients[midpoint:]


    # sends a UDP packet
    def send_udp(self, client):   
        # send udp packet method 1: echo "some random packet" | nc -u localhost 9001
        msg = b'some random packet' 

        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.bind((client, 0))  # Bind to the client's address
            s.sendto(msg, ('127.0.0.1', 9001))


    # website crawler
    def requester(self, client, level):
        # setup socket
        socket = http.client.HTTPConnection('localhost', 9000, source_address=(client, 0))

        # send request to a random server page
        random_route = self.url + random.choice(self.routes)
        
        # header with auth and forwarded values
        _header_a = {
            "Authorization" : "Bearer random_header_value",
            "Forwarded"     : "random forwareded IP"
        }

        # header with custom content length
        _header_b = {
            "Content-Length" : random.randint(1000, 10000)
        }
        
        _methods = ['POST', 'DELETE', 'PUT', 'DELETE']
        random_method = random.choice(_methods)

        if level == "basic":
            socket.request('GET', random_route)
        else:
            if random.randint(1, 100) <= 80:
                socket.request('GET', random_route)
            else:
                if random.randint(1, 100) >= 50:
                    if random.randint(1, 100) >= 50:
                        socket.request('GET', random_route, headers=_header_a)
                    else:
                        socket.request('GET', random_route, headers=_header_b)
                else:
                    socket.request(random_method, random_route)

        # get the response
        response = socket.getresponse()
        status_code = response.status

        c = '[' + colored(f'Crawler', 'magenta', attrs=['bold']) + ']'
        r = colored(f'{random_route}', 'blue', attrs=['underline'])
        print(f'{c} : Client {client} - accessed {r}, status: {status_code}')

        # close the socket
        socket.close()


    # website crawl handler
    def crawl(self):
        # setup threads for crawl_basic and crawl_intensive
        # thread_basic = threading.Thread(target=self.crawl_basic)
        thread_intensive = threading.Thread(target=self.crawl_intensive)

        # start the threads
        # thread_basic.start()
        thread_intensive.start()

        # wait for threads to complete
        # thread_basic.join()
        thread_intensive.join()


    # continually crawl the website routes
    def crawl_basic(self):
        # each client makes a request every 1 minute
        num_clients = len(self.clients_a)
        total_time = 60  
        sleep_time = total_time / num_clients

        while True:
            for client in self.clients_a:
                # send x amount of requests from the client
                x = random.randint(1, 300)
                for _ in range(x):
                    self.requester(client, "basic")

                time.sleep(sleep_time)


    # crawl the website routes intensively
    def crawl_intensive(self):
        while True:
            for client in self.clients_b:
                
                # send a udp or tcp packet:
                p = random.randint(1, 100)
                if p >= 15:
                    # send normal request
                    # send x amount of requests from the client
                    x = random.randint(300, 1000)
                    for _ in range(x):
                        self.requester(client, "intensive") 
                else:
                    # send UDP packets
                    i = random.randint(1, 5)
                    for _ in range(i):                        
                        self.send_udp(client)


# start
if __name__ == '__main__':
    s = Simulate()
    s.crawl()