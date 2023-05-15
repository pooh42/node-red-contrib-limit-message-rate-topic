module.exports = function(RED) {
    function updateStatus(node) {
        node.status({
            fill: node.messagesCount > 0 ? 'green' : 'grey',
            shape: 'dot',
            text: 'Running timers: ' + node.messagesCount,
        });
    }

    function resetNode(node) {
        node.messages = {};
        node.messagesCount = 0;
        updateStatus(node);
    }

    function resetTimeouts(node) {
        for (let topic in node.messages) {
        clearTimeout(node.messages[topic].timeout);
            delete node.messages[topic];
        }
    }

    function messageRateTopic(config) {
        RED.nodes.createNode(this, config);

        let node = this;
        let noTopic = '__notopic';
        
        resetNode(node);
        node.period = config.period;
        node.periodUnit = config.periodUnit || "seconds";

        if (node.period < 1) {
            node.warn("Invalid period in node configuration: " + node.period + ". Period must be positive. Using default period (5 seconds)."); 
            node.period = 5;
            node.periodUnit = "seconds";
        }

        // Convert the 'period' value to milliseconds (based on the selected time unit)
        switch(node.periodUnit) {
            case "seconds":
                node.period *= 1000;
                break;
            case "minutes":
                node.period *= 1000 * 60;
                break;
            case "hours":
                node.period *= 1000 * 60 * 60;
                break;            
            case "days":
                node.period *= 1000 * 60 * 60 * 24;
                break;            
            default: // "mimeTypeslliseconds" so no conversion needed
        }
        
        node.on('input', function (msg, send, done) {
            
            if (msg.stopAll && msg.stopAll === true) {
                resetTimeouts(node);
                resetNode(node);
                updateStatus(node);
                if (done) {
                    done();
                }
                return;
            }

            let topic = msg.topic;

            if (msg.stopTimer && msg.stopTimer === true) {
                if (topic && node.messages[topic]) {
                    clearTimeout(node.messages[topic].timeout);
                    delete node.messages[topic];
                    node.messagesCount--;
                }
                else if (!topic && node.messages[noTopic]) {
                    clearTimeout(node.messages[noTopic].timeout);
                    delete node.messages[noTopic];
                    node.messagesCount--;
                }
                updateStatus(node);
                if (done) {
                    done();
                }
                return;
            }
            
            topic = topic || noTopic; 
    
            if (node.messages[topic] === undefined) {
                node.send(msg);
                node.messagesCount++;
                updateStatus(node);
                
                if (msg.period && (msg.period < 1)) {
                    node.warn("Invalid period in msg.period: " + msg.period + ". Period must be positive. Using default period (5 seconds)."); 
                    msg.period = 5;
                }

                node.messages[topic] = {
                    timeout: setTimeout(function () {
                        delete node.messages[topic];
                        node.messagesCount--;
                        updateStatus(node);
                    }, (msg.period * 1000) || node.period),
                    msg: msg,
                };
            }
            
            if (done) {
                done();
            }
        });
    }

    RED.nodes.registerType('message-rate-topic', messageRateTopic);
}
