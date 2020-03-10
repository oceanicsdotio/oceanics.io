#!/usr/bin/env bash
mcs -reference:bin/ShellSIM.dll -out:bin/kernel.exe src/kernel.cs src/json.cs