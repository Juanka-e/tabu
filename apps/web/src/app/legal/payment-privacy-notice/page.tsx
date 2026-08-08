import { LegalDocumentPage, LegalSection } from "@/components/payments/legal-document-page";
import { getPaymentLegalReadiness } from "@/lib/payments/legal";

export const metadata = { robots: { index: false, follow: false } };

export default function PaymentPrivacyNoticePage() {
    const legal = getPaymentLegalReadiness();
    const controller = legal.businessName ?? "[Veri sorumlusu işletme unvanı]";
    const contact = legal.contactEmail ?? "[Başvuru e-posta adresi]";

    return (
        <LegalDocumentPage eyebrow="KVKK" title="Ödeme Aydınlatma Metni" version={legal.privacyNoticeVersion} ready={legal.ready}>
            <LegalSection title="Veri sorumlusu">
                <p>{controller}, ödeme işlemleri kapsamında veri sorumlusu olarak hareket eder. İletişim ve başvuru adresi: {contact}.</p>
            </LegalSection>
            <LegalSection title="İşlenen veriler ve amaçlar">
                <p>Hesap kimliği, sipariş ve ürün bilgileri, işlem zamanı, ödeme sağlayıcısı referansları, sınırlı teknik güvenlik kayıtları ile ödeme sonucu; siparişin kurulması, tahsilatın doğrulanması, ürünün teslimi, iade/itiraz süreçleri, dolandırıcılığın önlenmesi ve yasal yükümlülüklerin yerine getirilmesi amacıyla işlenir.</p>
                <p>PayTR ödeme oturumu oluşturulurken ad-soyad, telefon, adres ve doğrulanmış hesap e-postası işlem için PayTR’ye iletilir. Ad-soyad, telefon ve adres Hushle sipariş, audit veya uygulama log kayıtlarına kopyalanmaz.</p>
                <p>Kart numarası ve kart güvenlik kodu Hushle sistemlerinde tutulmaz; bu bilgiler seçilen ödeme sağlayıcısının güvenli ödeme yüzeyinde işlenir.</p>
            </LegalSection>
            <LegalSection title="Hukuki sebep, toplama yöntemi ve aktarım">
                <p>Veriler elektronik ortamda kullanıcı, uygulama ve ödeme sağlayıcısından otomatik yöntemlerle elde edilir. İşleme; sözleşmenin kurulması veya ifası, hukuki yükümlülükler ve meşru menfaat kapsamındaki güvenlik ihtiyaçlarına dayanır.</p>
                <p>Gerekli veriler ödeme sağlayıcısına, altyapı hizmet sağlayıcılarına ve hukuken yetkili kurumlara amaçla sınırlı olarak aktarılabilir. Yurt dışı aktarım durumu seçilecek sağlayıcı ve barındırma mimarisi kesinleştiğinde bu metinde ayrıca belirtilmelidir.</p>
            </LegalSection>
            <LegalSection title="Haklar ve başvuru">
                <p>KVKK kapsamındaki bilgi alma, düzeltme, silme, itiraz ve diğer talepler {contact} adresine iletilebilir. Kimlik doğrulaması için yalnız gerekli bilgiler talep edilir.</p>
            </LegalSection>
        </LegalDocumentPage>
    );
}
