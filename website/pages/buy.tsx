import { Footer } from '@/components/footer';
import { Mayan } from '@/components/mayan';
import { Navbar } from '@/components/navbar';

export default function Buy() {
  return (
    <div className="min-h-screen container mx-auto px-4 py-5" role="main">
      <Navbar />
      <main className="flex flex-col items-center justify-center mt-4">
        <Mayan />
      </main>
      <Footer />
    </div>
  );
}
