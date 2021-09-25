---
title: Container cluster
date: "2018-04-02T12:00:00.000Z"
description: "Basics of running applications as a cluster of Linux containers."
tags: ["kubernetes", "docker", "linux"]
---

# Docker 

Docker is a container service for hosting web or local applications. Containers are use resources more efficiently than virtual machines. Deployment across many machines or multiple clouds needs to be orchestrated. We will use Kubernetes to run multiple Python Flask applications, and map these services to ports using Nginx as a reverse proxy.

## Install

Docker can be installed on natively on Linux or inside a virtual machine on macOS and Windows. It works on Raspberry Pi and NVIDIA Jetson development platforms. 

All commands assume you have root privilege. 
If something doesn't work, or you don't want to default to root, prefix commands with the usual `sudo`. 



### Raspberry Pi

For the RPi, you can use a script provided by Docker,  

```bash
curl -sSL https://get.docker.com | sh
usermod -aG docker pi
```



### Jetson TX2

A TX2 running Ubuntu for Tegra (U4T) will need some utilities, so do `apt-get install curl nano`. 
You will have to flash the TX2 with at JetPack >= v3.3 for there to be container support. Install manually with, 

```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
apt-get update
apt-get install docker-ce
```

If you want to start the service immediately, 

```bash
systemctl enable docker
systemctl start docker
```



# Kubernetes

Container clusters can be used with Docker Swarm, but if you get serious about deploying microservices, you'll need to learn the industry standard Kubernetes (k8s). This is a [container orchestration and clustering](https://youtu.be/v77FFbQwC6E) tool which came out of Google. 

There are a boggling number of certified providers popping up. Depending on who you use as a cloud computing platform, your tool of choice might vary. 

We maintain three environments:

* Digital Ocean managed cluster for production
* single-node `minikube`  bundled with Docker-for-Mac for development
* Native installation with x86-64 controller and ARM64 workers 

RPi don't really cut it as controllers, and get bogged down quickly. Ubuntu 16.04 is (at time of writing) required for flashing the TX2, and works well as a controller on a Intel Mac. The TX2 can also run the control plane if you're not doing interactive work.


## Install

### Preparation

The bare-metal cluster is composed of System-on-a-Chip (SoC) nodes running Raspbian Lite or U4T Linux distros. Linux uses swap space to exchange data between memory and disk, but is not supported by k8s. First disable and remove it,

```bash
dphys-swapfile swapoff
dphys-swapfile uninstall
update-rc.d dphys-swapfile remove
```

Use the text editor of your choice (`nano` is easy, and we installed it earlier), to append `cgroup_enable=cpuset cgroup_enable=memory cgroup_memory=1` to the `/boot/cmdline.txt` file. Then `reboot`. 

> The `cgroups` (control groups) kernel was introduced to Linux by Google contributers, so no surprise that k8s requires it. The `cgroup_memory=1` option is probably unnecessary (it does the same thing as `cgroup_enable=memory`, and was introduced as a requirement temporarily during an update to the Raspbian OS).

### Setup

Get repository info and install the [admin interface](https://kubernetes.io/docs/setup/independent/create-cluster-kubeadm/) package,    

```bash
curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
echo "deb http://apt.kubernetes.io/ kubernetes-xenial main" | tee /etc/apt/sources.list.d/kubernetes.list
apt-get update -q
apt-get install -qy kubeadm
```

You initialize a cluster on the managing instance with `kubeadm init`, which will provide next steps and instructions for connecting workers.

The cluster needs a container networking interface (CNI). Weave, Calico, and Flannel come up often. Weave can be applied with, 

```
kubectl apply -f "https://cloud.weave.works/k8s/net?k8s-version=$(kubectl version | base64 | tr -d '\n')"
```

Weave Net implements the [cluster networking model](https://kubernetes.io/docs/concepts/cluster-administration/networking/) required for k8s. Specifically, all containers within a pod share a single IP address and can access each other on `localhost`, and all containers/nodes can talk to all containers. 

As workers join the cluster, they will visible to `kubectl get nodes`.  

### Troubleshooting

Some libraries may be needed for communication, certificates, and encryption,

```bash
apt-get install apt-transport-https ca-certificates curl software-properties-common
```

You may also need to edit the repository list so apt-get can fetch dependencies (socat), `nano /etc/apt/sources.list`.