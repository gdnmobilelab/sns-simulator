var SNSSimulator = require('../');
var AWS = require('aws-sdk');
var assert = require('assert');

describe("SNS Simulator", function() {

    beforeEach(function() {
        SNSSimulator.setup();
    })

    afterEach(function() {
        SNSSimulator.reset();
    })

    it("allows you to subscribe to a topic", function(done) {
    
        var sns = new AWS.SNS();

        sns.createTopic({
            Name: 'TestTopic'
        }, function(err, resp) {

            sns.subscribe({
                TopicArn: resp.TopicArn,
                Protocol: 'lambda'
            }, function(err) {
                assert.equal(err, null);
                done();
            })

        });
    });

    it("allows you to publish to a topic", function(done) {
        var sns = new AWS.SNS();


        sns.createTopic({
            Name: 'TestTopic'
        }, function(err, resp) {
            assert.equal(err, null);

            SNSSimulator.once('publish:' + resp.TopicArn, function(message) {
                assert.equal(message, 'hello');
                done()
            })
            
            sns.publish({
                TopicArn: resp.TopicArn,
                Message: "hello"
            }, function() {

            });
        })
    })

    it("allows a Lambda to subscribe to a topic", function(done) {
        var testLambda = function(event, context) {
            assert.equal(event.Records[0].Sns.Message, "hello");
            done();
        }

        SNSSimulator.registerLambda('test-lambda-arn', testLambda);

        var sns = new AWS.SNS();

        sns.createTopic({
            Name: 'TestTopic'
        }, function(err, resp) {
            assert.equal(err, null);
            sns.subscribe({
                TopicArn: resp.TopicArn,
                Protocol: 'lambda',
                Endpoint: 'test-lambda-arn'
            }, function(err) {
                assert.equal(err, null);

                sns.publish({
                    TopicArn: resp.TopicArn,
                    Message: "hello"
                }, function(err) {
                    assert.equal(err, null);
                });
            })
        })
    })
})