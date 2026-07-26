// Floating WhatsApp contact button. `number` is a raw phone number from
// settings; the wa.me link needs digits only. Renders nothing when unset.
export default function WhatsAppFab({ number }: { number?: string | null }) {
  const digits = (number ?? "").replace(/\D/g, "");
  if (!digits) return null;

  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      title="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 hover:brightness-95"
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7 fill-current" aria-hidden="true">
        <path d="M16.004 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.257.59 4.463 1.71 6.407L3.2 28.8l6.56-1.71a12.74 12.74 0 006.243 1.59h.005c7.06 0 12.8-5.74 12.8-12.8 0-3.42-1.332-6.635-3.75-9.052A12.71 12.71 0 0016.004 3.2zm0 23.36h-.004a10.55 10.55 0 01-5.375-1.472l-.386-.229-3.892 1.02 1.038-3.794-.251-.39a10.53 10.53 0 01-1.614-5.615c0-5.867 4.774-10.64 10.646-10.64a10.57 10.57 0 017.523 3.12 10.55 10.55 0 013.117 7.525c0 5.867-4.774 10.645-10.646 10.645zm5.834-7.968c-.32-.16-1.892-.933-2.185-1.04-.293-.107-.507-.16-.72.16-.213.32-.826 1.04-1.013 1.253-.187.213-.373.24-.693.08-.32-.16-1.35-.498-2.572-1.587-.95-.848-1.593-1.895-1.78-2.215-.186-.32-.02-.493.14-.652.144-.144.32-.373.48-.56.16-.187.213-.32.32-.533.107-.213.053-.4-.027-.56-.08-.16-.72-1.735-.986-2.375-.26-.624-.524-.54-.72-.55l-.613-.011a1.18 1.18 0 00-.853.4c-.293.32-1.12 1.093-1.12 2.667 0 1.573 1.147 3.093 1.307 3.307.16.213 2.253 3.44 5.46 4.824.763.33 1.358.527 1.822.674.766.244 1.463.21 2.014.127.614-.092 1.892-.773 2.158-1.52.267-.747.267-1.387.187-1.52-.08-.133-.293-.213-.613-.373z" />
      </svg>
    </a>
  );
}
