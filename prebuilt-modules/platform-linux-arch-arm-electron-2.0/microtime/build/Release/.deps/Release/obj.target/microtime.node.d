cmd_Release/obj.target/microtime.node := g++ -shared -pthread -rdynamic  -Wl,-soname=microtime.node -o Release/obj.target/microtime.node -Wl,--start-group Release/obj.target/microtime/src/microtime.o -Wl,--end-group 