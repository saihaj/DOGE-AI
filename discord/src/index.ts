import client from './bot';
import app from './server';
import { DISCORD_TOKEN, PORT } from './const';

client
  .login(DISCORD_TOKEN)
  .then(() =>
    console.info(`Logged into Discord successfully as ${client.user?.tag}`),
  )
  .catch(err => {
    console.error('Error logging into Discord', err);
    process.exit();
  });

app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});
