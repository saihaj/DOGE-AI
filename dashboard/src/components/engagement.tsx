import { useState } from 'react';
import { API_URL } from '@/lib/const';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { CopyButton } from './copy-button';
import { Loader2 } from 'lucide-react';

export function EngagementTweet({
  label,
  apiPath,
}: {
  label: string;
  apiPath: string;
}) {
  const [tweetUrl, setTweetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({
    answer: '',
    short: '',
    bill: '',
    metadata: '',
  });

  async function onSubmit() {
    setLoading(true);
    const mainPrompt = localStorage.getItem('mainPrompt');
    const refinePrompt = localStorage.getItem('refinePrompt');

    if (!tweetUrl) {
      alert('Please enter a valid Tweet URL');
      setLoading(false);
      return;
    }

    const tweetId = new URL(tweetUrl).pathname.split('/').pop();

    if (!tweetId) {
      alert('Please enter a valid Tweet URL');
      setLoading(false);
      return;
    }

    const response = await fetch(`${API_URL}${apiPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tweetId,
        mainPrompt,
        refinePrompt,
      }),
    });

    if (!response.ok) {
      alert('Failed to submit request');
      setLoading(false);
      return;
    }

    try {
      const result = await response.json();

      setResult(result);
      setLoading(false);
    } catch (e) {
      alert(`Error: ${e}`);
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col items-center px-2"
    >
      <div className="w-full px-2 pb-4">
        {result.answer ? (
          <div className="mt-32 flex flex-col mx-auto justify-center p-4 rounded-lg max-w-2xl">
            <div>
              <h2 className="text-xl font-bold mb-2">Answer:</h2>
              <div className="flex flex-col mb-4">
                <p className="whitespace-pre-wrap">{result.answer}</p>
                <CopyButton value={result.answer} className="-ml-2" />
              </div>
              <h3 className="text-lg font-semibold">Short:</h3>
              <div className="flex flex-col">
                <p className="whitespace-pre-wrap">{result.short}</p>
                <CopyButton value={result.short} className="-ml-2" />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-60 flex w-full flex-col items-center">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="email">{label}</Label>
                <Input
                  id="tweetUrl"
                  placeholder="https://x.com/..."
                  type="text"
                  value={tweetUrl}
                  onChange={e => setTweetUrl(e.target.value.trim())}
                  autoComplete="off"
                />
              </div>
              <div className="flex justify-center w-full mt-2">
                <Button
                  disabled={loading || tweetUrl.length <= 0}
                  type="submit"
                  className="w-48"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </form>
  );
}
