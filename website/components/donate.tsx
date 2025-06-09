import Script from 'next/script';
import { useEffect, useState } from 'react';

export default function PayPalDonate() {
  const [paypal, setPaypal] = useState(false);

  useEffect(() => {
    if (paypal) {
      console.log('PayPal SDK loaded');
      window.PayPal.Donation.Button({
        env: 'production',
        hosted_button_id: '5TZF42HDPFFDE',
        image: {
          src: 'https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif',
          alt: 'Donate with PayPal button',
          title: 'PayPal - The safer, easier way to pay online!',
        },
      }).render('#donate-button');
    }
  }, [paypal]);

  return (
    <>
      <Script
        src="https://www.paypalobjects.com/donate/sdk/donate-sdk.js"
        onLoad={() => setPaypal(true)}
      />
      <div id="donate-button-container">
        <div id="donate-button"></div>
      </div>
    </>
  );
}
