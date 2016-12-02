class Rcon {
    constructor(address) {
        ws = new WebSocket(serverAddress);
        ws.onopen = function () {
            logSend(new Packets.Login().set(name, authcode).asJSON());
        };
        ws.onmessage = function (evt) {
            try {
                var data = JSON.parse(evt.data);
                handlePacket(data);
            } catch (err) {
                ws.close();
            }
        };
        ws.onerror = function (error) {
        };

        ws.onclose = function () {
            ws = null;
        };
    }

    logSend(textMessage) {
        ws.send(textMessage);
        console.log("Sent " + textMessage);
    }
}