var mockAWSSinon = require('mock-aws-sinon');
var EventEmitter = require('events');
var util = require('util');
var BBPromise = require('bluebird');
var PromisifyAWSLambda = require('promisify-aws-lambda');

var topics = {};
var lambdas = {};

var SNSSimulator = function(opts) {};

var sentMessagesCount = 0;
var awsAccountID = 'DUMMYID';

var createMockLambdaContext = function() {
    return {
        done: function(err) {
            if (err) throw err;
        },
        fail: function(err) {
            throw err;
        },
        success: function() {}
    }
}

SNSSimulator.prototype = {
    setup: function() {
        var _this = this;
        mockAWSSinon('SNS', 'subscribe', this._subscribe.bind(this));
        mockAWSSinon('SNS', 'createTopic', this._createTopic.bind(this));
        mockAWSSinon('SNS', 'publish', this._publish.bind(this));
    },
    
    setAWSAccountID(id) {
        awsAccountID = id;
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
            return cb(new Error("Topic " + params.TopicArn + " does not exist."))
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
        var newArn = 'arn:aws:sns:' + [process.env.AWS_REGION, awsAccountID, params.Name].join(':')
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
       
        BBPromise.map(topics[params.TopicArn]._subscribers, function(subscriber) {
            if (subscriber.Protocol === 'lambda') {
                var targetLambda = lambdas[subscriber.Endpoint];
                if (!targetLambda) {
                    console.warn("Send publish to lambda " + subscriber.Endpoint + " but it does not exist.");
                    return;
                }

                return PromisifyAWSLambda(targetLambda,{
                    Records: [
                        {
                            Sns: {
                                Message: params.Message,
                                TopicArn: params.TopicArn,
                                MessageId: (function() {
                                    sentMessagesCount++
                                    return 'message_' + sentMessagesCount
                                })()
                            }
                        }
                    ]
                    

                });
            }
        })
        .then(() => {
            cb(null);
        })

        
    }
};

util.inherits(SNSSimulator, EventEmitter);

module.exports = new SNSSimulator();