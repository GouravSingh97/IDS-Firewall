# imports
import platform
import itertools
import subprocess

'''
    Creates numerous private interfaces (mimic proxy server)
    stores the 'proxies' in a proxies file which is used for
    bypassing rate limiting
'''
class Proxy():
    def __init__(self):
        # list of virtual ips
        self.ip_addresses = []
        self.ip_amount = 2000
        self.setup()


    # select script option
    def setup(self):
        line = '\n================'
        _a = '    Options:\n'
        _b = '[1]: Create ips\n[2]: Remove ips\n'
        _help = f'{line}\n{_a}\n{_b}{line}\n'
        print(_help)

        choice = str(input('Option: '))
        
        # create ips
        if choice == "1":
            self.config()
            self.create()

        # remove ips
        if choice == "2":
            self.remove()


    # creates a list of 2000 private ip addresses
    def config(self):
        '''
            192.168.0.0 - 192.168.255.255 (65,536 IP addresses)
            172.16.0.0  - 172.31.255.255 (1,048,576 IP addresses)
            10.0.0.0    - 10.255.255.255 (16,777,216 IP addresses)
        '''

        # create 2000 private IP addresses
        for x, y, z in itertools.product(range(256), repeat=3):
            
            # Add 10.x.y.z addresses up to 1000 entries
            if len(self.ip_addresses) < 1000:
                self.ip_addresses.append(f'10.{x}.{y}.{z}')
            
            # Add 172.16.x.y to 172.31.x.y addresses up to 1000 entries
            elif len(self.ip_addresses) < self.ip_amount:
                self.ip_addresses.append(f'172.{16 + x}.{y}.{z}')
            else:
                break

        # Save the ip addresses
        with open('proxies', 'w') as file:
            file.write('\n'.join(self.ip_addresses))
        

    # create private ips from list
    def create(self):
        # handle linux and macOS(Darwin kernal) systems
        if platform.system() in ['Linux', 'Darwin']:

            # configure the private IP addresses on network interface aliases
            for i, ip in enumerate(self.ip_addresses):
                alias = f'lo:{i}'
                command = f'sudo ifconfig {alias} {ip} netmask 255.255.255.0 up'
                subprocess.run(command, shell=True, check=True)

        # handle windows systems
        if platform.system() == "Windows":
            for i, ip in enumerate(self.ip_addresses):
                alias = f"Loopback Pseudo-Interface 1:{i}"
                command = f'netsh interface ipv4 add address "{alias}" {ip}/24'
                subprocess.run(command, shell=True, check=True)

        print('created ips\n')


    # remove private ips
    def remove(self):

        # handle linux and macOS(Darwin kernal) systems
        if platform.system() in ["Linux", "Darwin"]:
            for i in range(0, self.ip_amount):
                command = f'sudo ifconfig lo:{i} down'
                subprocess.run(command, shell=True, check=True)

        # handle windows systems
        if platform.system() == "Windows":
            for i in range(0, self.ip_amount):
                alias = f"Loopback Pseudo-Interface 1:{i}"
                command = f'powershell -Command "Remove-NetIPAddress -InterfaceAlias \'{alias}\'"'
                subprocess.run(command, shell=True, check=True)

        # clear proxy file
        with open('proxies', 'w') as file:
            pass

        print('removed created ips\n')


# start
if __name__ == '__main__':
    proxy = Proxy()