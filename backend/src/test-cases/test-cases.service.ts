import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { DEFAULT_TEST_CASES } from "./default-test-cases.const";

// Kullanici istegi: ayri (admin disi) bir test takip ekrani icin
// servis - test senaryolarini listeler, durum/not guncellemesini
// (guncelleyen kisinin adiyla birlikte) kaydeder.
@Injectable()
export class TestCasesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.testCase.findMany({ orderBy: { no: "asc" } });
  }

  // Kullanici istegi: bir test satirinin durumu/notu guncellenince,
  // GUNCELLEYEN KISININ ADI da (o an "Testi Yapan" alanina girilmis
  // olan) kaydedilir.
  async update(
    id: string,
    data: { status?: string; note?: string; updatedBy: string }
  ) {
    return this.prisma.testCase.update({
      where: { id },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
        lastUpdatedBy: data.updatedBy,
        lastUpdatedAt: new Date(),
      },
    });
  }

  // Kullanici istegi: 54 test senaryosu ELLE tiklamaya gerek kalmadan,
  // uygulama BASLARKEN otomatik olarak (tablo bossa) yuklenir.
  async onModuleInit(): Promise<void> {
    try {
      const count = await this.prisma.testCase.count();
      if (count === 0) {
        await this.prisma.testCase.createMany({
          data: DEFAULT_TEST_CASES.map((tc) => ({ ...tc, status: "Test Edilmedi" })),
        });
      }
    } catch {
      // Baslangicta DB henuz hazir degilse sessizce gec.
    }
  }
}
