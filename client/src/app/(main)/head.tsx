const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slaytim.com';

export default function MainHead() {
  return (
    <>
      <link rel="canonical" href={BASE_URL} />
    </>
  );
}

