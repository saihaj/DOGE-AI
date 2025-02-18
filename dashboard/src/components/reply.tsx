import { useState } from 'react';
import { API_URL } from 'src/const';

export function ReplyTweet() {
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

    const response = await fetch(`${API_URL}/api/test/reply`, {
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
      className="ai_hud_form animate-in fade-in slide-in-from-bottom duration-1000 flex flex-col items-center px-2"
    >
      <div className="w-full px-2 pb-4">
        {result.answer ? (
          <div className="bg-stone-800 p-4 rounded-lg max-w-2xl">
            <h2 className="text-xl font-bold mb-2">Answer:</h2>
            <p className="mb-4 whitespace-pre-wrap">{result.answer}</p>
            <h3 className="text-lg font-semibold">Short:</h3>
            <p className="whitespace-pre-wrap">{result.short}</p>
          </div>
        ) : (
          <>
            <label className="text-sm text-base-30 0 text-stone-400 font-medium leading-none">
              Enter Tweet URL to Reply to
            </label>

            <div className="mt-2 flex w-[22rem] sm:w-96">
              <div className="relative w-full input-shadow-glow inset-px rounded-[9987px] shadow-white/5 transition focus-within:shadow-stone-100/20 base-white/5 focus-within:shadow-stone-500/30">
                <input
                  autoComplete="off"
                  className="w-full text-lg py-4 pl-12 pr-7 font-semibold shadow-2xl border border-stone-600/40 bg-stone-700/60 text-stone-100 shadow-stone-100/45 placeholder:text-stone-100 focus:placeholder-stone-400 focus:bg-stone-600/60 focus:ring-2 focus:ring-stone-700/50  disabled:cursor-not-allowed disabled:opacity-50 sm:leading-6 input-shadow  rounded-full  !outline-none relative"
                  id="tweetUrl"
                  placeholder="https://x.com/..."
                  type="text"
                  value={tweetUrl}
                  onChange={e => setTweetUrl(e.target.value.trim())}
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="stroke-stone-500/70"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.3-4.3"></path>
                  </svg>
                </div>
              </div>
            </div>

            <div className="mt-6 flex w-full flex-col items-center">
              <div className="flex justify-center w-full">
                <button
                  disabled={loading}
                  type="submit"
                  className="disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:bg-blue-700 bg-blue-700 px-4 py-2 rounded-md min-w-64 min-h-11 flex items-center justify-center text-white font-semibold text-lg shadow-2xl transition duration-200 ease-in-out hover:bg-blue-800"
                >
                  {loading ? (
                    <svg
                      className="animate-spin h-7 w-7 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </form>
  );
}
