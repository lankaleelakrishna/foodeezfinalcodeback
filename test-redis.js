const KeyvRedis = require('@keyv/redis').default;

const REDIS_URL = 'rediss://:gQAAAAAAAdFnAAIgcDExZTgxOGJjNjdmZWE0OWI1OWViNmEwZjg5ZjM3MWRmZQ@obliging-mammoth-119143.upstash.io:6379';

async function testRedis() {
  const store = new KeyvRedis(REDIS_URL);

  try {
    console.log('Connecting to Upstash Redis...');

    await store.set('foodeez:test', 'Hello from Foodeez!', 30000);
    console.log('SET   foodeez:test = "Hello from Foodeez!"');

    const value = await store.get('foodeez:test');
    console.log('GET   foodeez:test =', value);

    await store.delete('foodeez:test');
    console.log('DEL   foodeez:test');

    console.log('\nRedis is connected and working!');
  } catch (err) {
    console.error('\nRedis connection FAILED:', err.message);
  } finally {
    await store.disconnect();
  }
}

testRedis();
