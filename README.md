# IDS-Firewall
# Firewall and Intrusion Detection System (IDS) Demo

## 🔐 Introduction

This project demonstrates core cybersecurity defenses in enterprise networks using a custom **Firewall** and **Intrusion Detection System (IDS)**. The application simulates how network traffic can be monitored, filtered, and analyzed to detect and respond to potential security threats.

---

## 🧪 Terminal Output

> Sample logs and alerts are printed in the terminal to visualize firewall actions, IDS detections, and client behavior.

---

## ✨ Features

- **Firewall Configuration**  
  Control and monitor incoming/outgoing traffic based on predefined security rules stored in `firewall_config.json`.

- **Intrusion Detection System (IDS)**  
  Analyze traffic and detect malicious patterns using configurable rules and thresholds from `ids_config.json`.

- **Rate Limiting**  
  Prevent abuse by limiting the number of requests clients can make in a given time frame.

- **Client Tracking**  
  Monitor client IPs and track access behavior to detect anomalies and suspicious usage.

- **Error Handling**  
  Redirects clients to appropriate error pages or returns status codes for blocked or suspicious activity.

---

## 🚀 Getting Started

### 🔁 Clone the Repository

```bash
git clone https://github.com/GouravSingh97/IDS-Firewall.git
cd IDS-Firewall
