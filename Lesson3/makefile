C=gcc
CFLAGS=--std=c99 -I/usr/include/azureiot -I/usr/include/azureiot/inc/
LIBS=-lwiringPi -lserializer -liothub_client -liothub_client_mqtt_transport -lumqtt -laziotsharedutil -lssl -lcrypto -lcurl -lpthread -lm -lssl

main: main.c
	${CC} -o main main.c ${CFLAGS} ${LIBS}

.PHONY: clean
clean:
	rm -f main
