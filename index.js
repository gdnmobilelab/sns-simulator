var mockAWSSinon = require('mock-aws-sinon');
var EventEmitter = require('events');
var util = require('util');

var topics = {};
var lambdas = {};

var SNSSimulator = function(opts) {};

var sentMessagesCount = 0;

var mockLambdaContext = {
    done: function() {},
    fail: function() {},
    success: function() {}
}

SNSSimulator.prototype = {
    setup: function() {
        var _this = this;
        mockAWSSinon('SNS', 'subscribe', this._subscribe.bind(this));
        mockAWSSinon('SNS', 'createTopic', this._createTopic.bind(this));
        mockAWSSinon('SNS', 'publish', this._publish.bind(this));
    },

    reset: function() {
        topics = {};
        mockAWSSinon('SNS', 'subscribe').restore();
        mockAWSSinon('SNS', 'createTopic').restore();
        mockAWSSinon('SNS', 'publish').restore();
    },

    restore: function() {
        mockAWSSinon.restore();
    },

    registerLambda: function(arn, func) {
        lambdas[arn] = func;
    },

    _subscribe: function(params, cb) {
        

        if (!topics[params.TopicArn]) {
            return cb(new Error("Topic does not exist."))
        }

        var newArn = 'example:arn:subscription:' + params.TopicArn + ':' + topics[params.TopicArn]._subscribers.length 

        var returnParams = {
            SubscriptionArn: newArn
        }

        topics[params.TopicArn]._subscribers.push(params);

        this.emit('subscribe', returnParams);
        cb(null, returnParams);

    },
    _createTopic: function(params, cb) {
        var newArn = 'example:arn:' + String(Object.keys(topics).length);

        for (var topicArn in topics) {
            if (topicArn.Name === params.Name) {
                return cb(new Error("Topic with this name already exists"))
            }
        }

        topics[newArn] = {
            Name: params.Name,
            _subscribers: []
        };

        cb(null, {
            TopicArn: newArn
        })
    },
    _publish: function(params, cb) {
        this.emit('publish:' + params.TopicArn, params.Message);
        cb(null);

        topics[params.TopicArn]._subscribers.forEach(function(subscriber) {
            if (subscriber.Protocol === 'lambda') {
                var targetLambda = lambdas[subscriber.TargetArn];
                if (!targetLambda) {
                    console.warn("Send publish to lambda " + subscriber.TargetArn + " but it does not exist.");
                    return;
                }

                targetLambda({
                    Sns: {
                        Message: params.Message,
                        TopicArn: params.TopicArn,
                        MessageId: (function() {
                            sentMessagesCount++
                            return 'message_' + sentMessagesCount
                        })()
                    }

                });
            }
        });
    }
};

util.inherits(SNSSimulator, EventEmitter);

module.exports = new SNSSimulator();