# sns-simulator

A library for testing AWS Lambda flows through SNS topics. A very quick
project, so there is more that it doesn't do than it does - right now it
**only supports Lambdas**, `SNS.createTopic()`, `SNS.publish()` and 
`SNS.subscribe()`. 

 There's no 
reason why this couldn't also hit HTTP/HTTPS endpoints and the like, but
that functionality is not built in yet.

## How to use it

    var SNSSimulator = require('sns-simulator');
    
## Methods

#### setup()

Stub out methods on `aws-sdk` to allow you to simulate an SNS flow. After
this you can use `SNS.createTopic()`, `SNS.publish()` and `SNS.subscribe()`
and it'll use the mocked flow.

Note, though, that no other methods, like `SNS.listTopics()` are stubbed yet.

In addition to these overrides, there are some extra methods:

#### registerLambda(arn, func)

Register a lambda function at the fake ARN you specify. `func` needs to be
the function itself, not the module.

#### reset()

Remove all the topics and lambdas you've created so far.

#### restore()

Remove the stub from `aws-sdk` and restore it to regular functionality.

## Events

Even though there is no built in functionality for different protocols,
`SNSSimulator` will emit a `publish:${arn}` event when publishing, as well
as a `subscribe` event when receiving a new subscriber.

## Status

So far I've used this in a limited capacity in one project. Which is to say,
it is not very widely used or tested. You may run into problems using it - 
open an issue if you do.