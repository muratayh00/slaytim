const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { categoryData } = require('./categoryData');
const { categoryTreeData } = require('./categoryTreeData');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const uploadsSlidesDir = path.join(__dirname, '../uploads/slides');
  const seedDemoFileName = 'seed-demo.pptx';
  const seedDemoAbsPath = path.join(uploadsSlidesDir, seedDemoFileName);
  const seedDemoUrl = `/uploads/slides/${seedDemoFileName}`;

  let canSeedSlidesWithFile = false;
  if (fs.existsSync(seedDemoAbsPath)) {
    canSeedSlidesWithFile = true;
  } else if (fs.existsSync(uploadsSlidesDir)) {
    const firstPptx = fs.readdirSync(uploadsSlidesDir).find((f) => /\.pptx$/i.test(f));
    if (firstPptx) {
      fs.copyFileSync(path.join(uploadsSlidesDir, firstPptx), seedDemoAbsPath);
      canSeedSlidesWithFile = true;
      console.log(`[seed] demo source prepared: ${firstPptx} -> ${seedDemoFileName}`);
    }
  }

  if (!canSeedSlidesWithFile) {
    console.warn('[seed] uploads/slides altinda .pptx bulunamadi; bozuk preview olusmamasi icin demo slayt kayitlari atlanacak.');
  }

  // Main/Sub category tree
  const cats = {};
  const curatedSlugs = new Set();
  for (const main of categoryTreeData) {
    curatedSlugs.add(main.slug);
    const mainCategory = await prisma.category.upsert({
      where: { slug: main.slug },
      update: {
        name: main.name,
        isMain: true,
        isActive: true,
        parentId: null,
        sortOrder: Number(main.sortOrder || 0),
      },
      create: {
        name: main.name,
        slug: main.slug,
        isMain: true,
        isActive: true,
        parentId: null,
        sortOrder: Number(main.sortOrder || 0),
      },
    });
    cats[main.slug] = mainCategory;

    for (const child of main.children || []) {
      curatedSlugs.add(child.slug);
      const sub = await prisma.category.upsert({
        where: { slug: child.slug },
        update: {
          name: child.name,
          isMain: false,
          isActive: true,
          parentId: mainCategory.id,
          sortOrder: Number(child.sortOrder || 0),
        },
        create: {
          name: child.name,
          slug: child.slug,
          isMain: false,
          isActive: true,
          parentId: mainCategory.id,
          sortOrder: Number(child.sortOrder || 0),
        },
      });
      cats[child.slug] = sub;
    }
  }

  // Legacy category set (kept active for existing content, hidden from main-picker)
  for (const cat of categoryData) {
    if (curatedSlugs.has(cat.slug)) continue;
    const c = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        isMain: false,
        isActive: true,
        sortOrder: 999,
      },
      create: {
        ...cat,
        isMain: false,
        isActive: true,
        sortOrder: 999,
      },
    });
    cats[cat.slug] = c;
  }

  // Kullanicilar
  const passwordHash = await bcrypt.hash('password123', 10);
  const users = {};
  const userDefs = [
    { username: 'demo', email: 'demo@slaytim.com', bio: 'Slaytim demo kullanicisi' },
    { username: 'ahmet_yilmaz', email: 'ahmet@slaytim.com', bio: 'Yazilim muhendisi & teknoloji meraklisi' },
    { username: 'zeynep_k', email: 'zeynep@slaytim.com', bio: 'UX tasarimcisi | Figma uzmani' },
    { username: 'murat_fin', email: 'murat@slaytim.com', bio: 'Finansal analist ve yatirim danismani' },
    { username: 'elif_edu', email: 'elif@slaytim.com', bio: 'Egitim teknolojileri uzmani' },
  ];
  for (const u of userDefs) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { username: u.username, email: u.email, passwordHash, bio: u.bio },
    });
    users[u.username] = user;
  }

  // Konular ve Slaytlar
  const topicsData = [
    {
      title: '2024 Yapay Zeka Trendleri: GPT, Gemini ve Otesi',
      description: 'Buyuk dil modellerinin son gelismeleri ve sektore etkileri. ChatGPT, Google Gemini karsilastirmasi.',
      categorySlug: 'teknoloji', user: 'ahmet_yilmaz', likesCount: 247, viewsCount: 3820,
      slides: [
        { title: 'Yapay Zeka 2024: Buyuk Tablo', description: 'Sektorde one cikan modeller ve karsilastirmali analiz', likesCount: 89, savesCount: 34 },
        { title: 'GPT-4 vs Gemini vs Claude: Hangisi Daha Iyi?', description: 'Benchmark testleri ve guclu/zayif yonler', likesCount: 124, savesCount: 56 },
        { title: 'Kurumsal AI Adaptasyonu: Vaka Calismalari', description: 'Fortune 500 sirketlerinin AI entegrasyon deneyimleri', likesCount: 67, savesCount: 28 },
      ],
    },
    {
      title: 'React 19 Yenilikler: Server Components ve Actions',
      description: 'React 19 ile gelen Server Components mimarisi, yeni hooks ve performans iyilestirmeleri.',
      categorySlug: 'teknoloji', user: 'ahmet_yilmaz', likesCount: 183, viewsCount: 2640,
      slides: [
        { title: "React 19'a Genel Bakis", description: 'Breaking changes ve migration rehberi', likesCount: 72, savesCount: 41 },
        { title: 'Server Components Derinlemesine', description: 'RSC mimarisi, streaming ve Suspense', likesCount: 95, savesCount: 38 },
        { title: 'React Actions ile Form Yonetimi', description: 'useFormState, useFormStatus ve optimistic updates', likesCount: 61, savesCount: 22 },
      ],
    },
    {
      title: 'Docker ve Kubernetes ile Modern DevOps',
      description: 'Container teknolojileri, orchestration ve CI/CD pipeline kurulumu.',
      categorySlug: 'teknoloji', user: 'demo', likesCount: 156, viewsCount: 1980,
      slides: [
        { title: 'Docker Temelleri: Image, Container, Volume', description: 'Docker CLI komutlari ve Dockerfile yazimi', likesCount: 54, savesCount: 29 },
        { title: 'Kubernetes Mimarisi Explained', description: 'Pod, Service, Deployment ve Ingress kavramlari', likesCount: 78, savesCount: 43 },
      ],
    },
    {
      title: 'Startup Kurmanin 7 Altin Kurali',
      description: 'Basarili girisimlerin ortak noktalari, erken asamada yapilan hatalar ve investor iliskileri.',
      categorySlug: 'is-girisimcilik', user: 'demo', likesCount: 312, viewsCount: 4150,
      slides: [
        { title: 'Problem-Solution Fit Nedir?', description: 'Dogru problemi dogru cozmek uzerine framework', likesCount: 134, savesCount: 67 },
        { title: 'MVP Gelistirme Sureci', description: 'Minimum viable product nasil tasarlanir ve test edilir', likesCount: 98, savesCount: 52 },
        { title: 'Investor Pitch Deck Hazirlama', description: 'VC ve angel yatirimcilar icin ikna edici sunum', likesCount: 156, savesCount: 89 },
        { title: 'Ekip Kurma ve Yetenek Yonetimi', description: 'Ilk 10 calisani bulmak ve ise almak', likesCount: 87, savesCount: 34 },
      ],
    },
    {
      title: 'OKR Metodolojisi ile Hedef Yonetimi',
      description: 'Google ve teknoloji devlerinin kullandigi OKR sistemi nasil kurulur ve uygulanir?',
      categorySlug: 'is-girisimcilik', user: 'murat_fin', likesCount: 198, viewsCount: 2730,
      slides: [
        { title: 'OKR vs KPI: Fark Ne?', description: 'Iki metodolojinin karsilastirmali analizi', likesCount: 76, savesCount: 31 },
        { title: 'Sirket Geneli OKR Hizalamasi', description: 'Takimdan C-suite seviyeye hedef kaskadi', likesCount: 89, savesCount: 44 },
        { title: 'OKR Retrospektif ve Puanlama', description: 'Donem sonu degerlendirme ve ogrenme dongusu', likesCount: 54, savesCount: 19 },
      ],
    },
    {
      title: 'Etkili Not Alma Teknikleri: Cornell, Zettelkasten ve Daha Fazlasi',
      description: 'Farkli not alma sistemlerinin karsilastirmasi ve dijital araclarla entegrasyon.',
      categorySlug: 'egitim', user: 'elif_edu', likesCount: 267, viewsCount: 3560,
      slides: [
        { title: 'Cornell Metodu Rehberi', description: 'Sayfa duzeni, cue column ve summary bolumu', likesCount: 98, savesCount: 72 },
        { title: 'Zettelkasten: Bilgi Agi Kurma', description: 'Atomic notes, linking ve review sistemi', likesCount: 112, savesCount: 85 },
        { title: 'Notion ile Dijital Not Sistemi', description: 'Template ornekleri ve database yapisi', likesCount: 134, savesCount: 91 },
      ],
    },
    {
      title: 'Online Ogrenmenin Gelecegi: Mikro Ogrenme ve AI Tutorluk',
      description: 'EdTech trendleri, adaptif ogrenme sistemleri ve yapay zekanin egitimdeki rolu.',
      categorySlug: 'egitim', user: 'elif_edu', likesCount: 189, viewsCount: 2480,
      slides: [
        { title: 'Mikro Ogrenme Tasarim Prensipleri', description: '5-10 dakikalik etkili icerik yapisi', likesCount: 67, savesCount: 28 },
        { title: 'AI Tutor Sistemleri Karsilastirmasi', description: 'Khan Academy Khanmigo, Duolingo Max ve digerleri', likesCount: 89, savesCount: 41 },
      ],
    },
    {
      title: 'UI UX Tasariminin 10 Temel Ilkesi',
      description: "Nielsen'in 10 Heuristic ilkesi ve modern uygulamalari. Gercek projelerden ornekler.",
      categorySlug: 'tasarim', user: 'zeynep_k', likesCount: 334, viewsCount: 4820,
      slides: [
        { title: 'Kullanici Odakli Tasarim Nedir?', description: 'Human-centered design surec ve metodlari', likesCount: 145, savesCount: 78 },
        { title: 'Renk Teorisi ve Tipografi Uyumu', description: 'Renk psikolojisi, kontrast ve font secimi', likesCount: 167, savesCount: 94 },
        { title: 'Micro-interactions Tasarimi', description: 'Kullanici deneyimini iyilestiren kucuk animasyonlar', likesCount: 112, savesCount: 56 },
        { title: 'Erisebilirlik Standartlari', description: 'WCAG 2.1 AA standardina uyum rehberi', likesCount: 89, savesCount: 43 },
      ],
    },
    {
      title: 'Figma ile Profesyonel Prototipleme',
      description: 'Figma Auto Layout, Variables ve Component Properties ile produksiyon kalitesinde tasarim.',
      categorySlug: 'tasarim', user: 'zeynep_k', likesCount: 256, viewsCount: 3340,
      slides: [
        { title: 'Auto Layout Masterclass', description: 'Responsive tasarim ve spacing yonetimi', likesCount: 98, savesCount: 67 },
        { title: 'Design System Kurma', description: 'Token, component ve documentation yapisi', likesCount: 134, savesCount: 89 },
        { title: 'Figma Variables ile Dark Mode', description: 'Tema degiskenleri ve mode switching', likesCount: 76, savesCount: 45 },
      ],
    },
    {
      title: 'Sosyal Medya Stratejisi 2024: Platform Bazli Icerik Plani',
      description: 'Instagram, TikTok, LinkedIn ve X icin icerik stratejileri ve algoritma tuyolari.',
      categorySlug: 'pazarlama', user: 'demo', likesCount: 278, viewsCount: 3920,
      slides: [
        { title: 'Platform Secimi: Hedef Kitlenizi Nerede Bulursunuz?', description: 'Demografik veriler ve platform uyumu', likesCount: 112, savesCount: 54 },
        { title: 'Icerik Takvimi ve Toplu Uretim', description: 'Ayda 1 gunde 1 aylik icerik nasil uretilir', likesCount: 134, savesCount: 76 },
        { title: 'TikTok Algoritmasi 2024', description: 'FYP mantigi ve viral icerik formuller', likesCount: 189, savesCount: 98 },
      ],
    },
    {
      title: 'Kisisel Finans Temelleri: Butce, Tasarruf ve Yatirim',
      description: '50/30/20 kurali, acil fon olusturma, borc yonetimi ve ilk yatirim adimlari.',
      categorySlug: 'finans', user: 'murat_fin', likesCount: 398, viewsCount: 5640,
      slides: [
        { title: '50/30/20 Butce Kurali', description: 'Ihtiyac, istek ve tasarruf dagilimi', likesCount: 178, savesCount: 123 },
        { title: 'Acil Fon: Neden ve Nasil?', description: '3-6 aylik gider hedefi ve birikim stratejileri', likesCount: 145, savesCount: 98 },
        { title: 'Borsaya Baslangic: ETF ve Endeks Fonu', description: 'Dusuk maliyetli, uzun vadeli yatirim yaklasimi', likesCount: 212, savesCount: 167 },
        { title: 'Borc Kartopu vs Cig Yontemi', description: 'Borc odeme stratejilerinin matematik ve psikoloji analizi', likesCount: 98, savesCount: 54 },
      ],
    },
    {
      title: 'Kuantum Hesaplama: Gelecegin Bilgisayarlari',
      description: 'Kuantum bitleri, superpozisyon ve mevcut kuantum bilgisayarlarin gercek dunya uygulamalari.',
      categorySlug: 'bilim', user: 'ahmet_yilmaz', likesCount: 223, viewsCount: 2980,
      slides: [
        { title: 'Klasik vs Kuantum Bilgisayar', description: 'Bit vs qubit, hesaplama ustunlugu ne demek?', likesCount: 87, savesCount: 45 },
        { title: 'IBM Quantum ve Google Sycamore', description: 'Mevcut quantum supremacy iddialari', likesCount: 112, savesCount: 56 },
        { title: 'Kuantum Sifreleme ve Guvenlik', description: 'Post-quantum cryptography neden onemli?', likesCount: 78, savesCount: 34 },
      ],
    },
    {
      title: 'Modern Sanati Anlamak: Neden Soyut Tablo Milyonlara Satilir?',
      description: 'Modern sanatin tarihi, koleksiyon piyasasi, NFT sanat ve sanatin deger kazanma mekanizmalari.',
      categorySlug: 'sanat-kultur', user: 'zeynep_k', likesCount: 176, viewsCount: 2340,
      slides: [
        { title: 'Modern Sanat Akimlari Kronolojisi', description: 'Empresyonizmden gunumuze sanat tarihine bakis', likesCount: 67, savesCount: 34 },
        { title: 'Sanat Piyasasi Nasil Calisir?', description: 'Galeriler, muzayedeler ve koleksiyonerler', likesCount: 89, savesCount: 45 },
        { title: 'NFT Sanatin Yukselisi ve Cokusu', description: 'Dijital sanat sahipligi ve blockchain', likesCount: 112, savesCount: 67 },
      ],
    },
  ];

  for (const topicDef of topicsData) {
    let category = cats[topicDef.categorySlug];
    const user = users[topicDef.user];
    if (!category) {
      // Backward-compatible seed fallback: auto-create missing legacy categories.
      category = await prisma.category.upsert({
        where: { slug: topicDef.categorySlug },
        update: {},
        create: {
          slug: topicDef.categorySlug,
          name: topicDef.categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
        },
      });
      cats[topicDef.categorySlug] = category;
    }
    if (!user) {
      console.warn(`[seed] missing user mapping for topic "${topicDef.title}" -> ${topicDef.user}, skipping`);
      continue;
    }

    const existing = await prisma.topic.findFirst({
      where: { title: topicDef.title, userId: user.id },
    });
    if (existing) continue;

    const topic = await prisma.topic.create({
      data: {
        title: topicDef.title,
        description: topicDef.description,
        categoryId: category.id,
        userId: user.id,
        likesCount: topicDef.likesCount,
        viewsCount: topicDef.viewsCount,
      },
    });

    for (const slideDef of topicDef.slides) {
      if (!canSeedSlidesWithFile) continue;
      await prisma.slide.create({
        data: {
          title: slideDef.title,
          description: slideDef.description,
          fileUrl: seedDemoUrl,
          topicId: topic.id,
          userId: user.id,
          likesCount: slideDef.likesCount,
          savesCount: slideDef.savesCount,
        },
      });
    }
  }

  console.log('Seed tamamlandi: 13 konu, 40+ slayt olusturuldu');
  console.log('Demo giris: demo@slaytim.com / password123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
