import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

// Kullanici geri bildirimi: JwtService, JwtAuthGuard uzerinden neredeyse
// HER modulde ihtiyac duyulan bir servis haline geldi (6 farkli modul
// ayni "JwtModule.register({})" cagrisini tekrar tekrar yapiyordu - her
// biri BIREBIR ayni bos ayarlarla, cunku gercek secret/expiresIn her
// zaman cagri aninda ayrica veriliyor: this.jwt.signAsync(payload,
// {secret: ..., expiresIn: ...})). Bu yuzden PrismaModule ile ayni
// desende, JwtModule'u burada TEK SEFERDE @Global() olarak kaydedip
// export ediyoruz - artik hicbir modulun ayrica import etmesine gerek
// yok, "SettingsService bulunamadi" tarzi hatalarin bu servis icin
// tekrar tekrar cikmasini onler.
@Global()
@Module({
  imports: [JwtModule.register({})],
  exports: [JwtModule],
})
export class GlobalJwtModule {}
