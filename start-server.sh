#!/bin/bash
PORT=8001
ruby -rwebrick -e"WEBrick::HTTPServer.new(:Port => $PORT, :DocumentRoot => Dir.pwd).start"
