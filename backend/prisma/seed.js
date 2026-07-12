// Geliştirme ortamı için örnek veri üretir.
// Çalıştırmak için: npx prisma db seed
// (veya doğrudan: node prisma/seed.js)

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seed islemi basliyor...");

  // Onceki seed calismalarindan kalan veriyi temizle (idempotent olsun diye)
  await prisma.message.deleteMany();
  await prisma.poolEntry.deleteMany();
  await prisma.messageThread.deleteMany();
  await prisma.user.deleteMany();

  // --- Kullanicilar ---
  const initiator = await prisma.user.create({
    data: {
      phoneNumberHash: "seed_hash_initiator",
      displayName: "Ayse (Baslatan)",
      status: "active",
    },
  });

  const recipient = await prisma.user.create({
    data: {
      phoneNumberHash: "seed_hash_recipient",
      displayName: "Mehmet (Alici)",
      status: "active",
    },
  });

  const explorer = await prisma.user.create({
    data: {
      phoneNumberHash: "seed_hash_explorer",
      displayName: null, // anonim kalmayi tercih eden kullanici ornegi
      status: "active",
    },
  });

  console.log(`3 kullanici olusturuldu: ${initiator.id}, ${recipient.id}, ${explorer.id}`);

  // --- Senaryo A: Dogrudan mesaj (parola kilitli) ---
  const directThread = await prisma.messageThread.create({
    data: {
      originType: "direct",
      initiatorUserId: initiator.id,
      recipientUserId: recipient.id,
      lockType: "password",
      lockSecretHash: "seed_dummy_hash_mavi_klasor", // gercekte bcrypt hash olacak
      messages: {
        create: [
          {
            senderUserId: initiator.id,
            body: "Selam, seninle konusmak istedigim bir sey vardi.",
            isAnonymous: true,
          },
          {
            senderUserId: recipient.id,
            body: "Merhaba! Tabii, dinliyorum.",
            isAnonymous: false,
          },
        ],
      },
    },
  });

  console.log(`Senaryo A thread olusturuldu: ${directThread.id}`);

  // --- Senaryo B: Havuz sorusu (soru-cevap kilitli) ---
  const poolThread = await prisma.messageThread.create({
    data: {
      originType: "pool",
      initiatorUserId: recipient.id,
      recipientUserId: explorer.id,
      lockType: "question",
      lockSecretHash: "seed_dummy_hash_kutuphanede",
      questionText: "Nerede tanistik?",
    },
  });

  console.log(`Senaryo B thread olusturuldu: ${poolThread.id}`);

  // --- Pool girisi (herkese acik) ---
  const poolEntry = await prisma.poolEntry.create({
    data: {
      ownerUserId: recipient.id,
      title: "Ortak Animiz",
      questionText: "Ilk nerede tanistik?",
      answerHash: "seed_dummy_hash_kutuphanede",
      category: "Sehir hafizasi",
      visibility: "public",
    },
  });

  console.log(`Pool entry olusturuldu: ${poolEntry.id}`);

  console.log("Seed islemi tamamlandi.");
}

main()
  .catch((e) => {
    console.error("Seed sirasinda hata olustu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
