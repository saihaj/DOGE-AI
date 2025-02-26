import client from 'prom-client';

export const promClient = client;

export const readiness = new promClient.Gauge({
  name: 'service_readiness',
  help: 'Shows if the service is ready to serve requests (1 is ready, 0 is not ready)',
});

export const tweetsIngested = new promClient.Counter({
  name: 'tweets_ingested',
  help: 'Number of tweets ingested',
  labelNames: ['method'],
});

export const tweetsProcessingRejected = new promClient.Counter({
  name: 'tweets_processing_rejected',
  help: 'Number of tweets rejected during processing',
  labelNames: ['method', 'reason'],
});

export const tweetsProcessed = new promClient.Counter({
  name: 'tweets_processed',
  help: 'Number of tweets processed',
  labelNames: ['method', 'action'],
});

export const tweetsExecuted = new promClient.Counter({
  name: 'tweets_executed',
  help: 'Number of tweets executed',
  labelNames: ['action', 'method'],
});

export const wokeTweetRewritten = new promClient.Counter({
  name: 'woke_tweet_rewritten',
  help: 'Number of woke tweets rewritten',
  labelNames: ['method', 'action'],
});

export const tweetsPublished = new promClient.Counter({
  name: 'tweets_published',
  help: 'Number of tweets published',
  labelNames: ['method', 'action'],
});
