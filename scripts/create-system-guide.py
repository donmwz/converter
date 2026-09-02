from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Flowable, KeepTogether
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "belgeler" / "convertly-sistem-mimarisi-ve-guvenlik-rehberi.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

pdfmetrics.registerFont(TTFont("DejaVu", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", r"C:\Windows\Fonts\arialbd.ttf"))

PURPLE = colors.HexColor("#7C3AED")
VIOLET = colors.HexColor("#A855F7")
INK = colors.HexColor("#16151A")
MUTED = colors.HexColor("#66616F")
LINE = colors.HexColor("#E8E4ED")
SOFT = colors.HexColor("#F7F4FA")
LILAC = colors.HexColor("#F0E9FF")
WHITE = colors.white
GREEN = colors.HexColor("#0F9F6E")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleX", fontName="DejaVu-Bold", fontSize=31, leading=36, textColor=INK, spaceAfter=8))
styles.add(ParagraphStyle(name="Kicker", fontName="DejaVu-Bold", fontSize=8.5, leading=11, textColor=PURPLE, tracking=1.6, spaceAfter=7))
styles.add(ParagraphStyle(name="H1X", fontName="DejaVu-Bold", fontSize=22, leading=27, textColor=INK, spaceAfter=12))
styles.add(ParagraphStyle(name="H2X", fontName="DejaVu-Bold", fontSize=13, leading=17, textColor=INK, spaceBefore=8, spaceAfter=6))
styles.add(ParagraphStyle(name="BodyX", fontName="DejaVu", fontSize=9.2, leading=14.2, textColor=MUTED, spaceAfter=7))
styles.add(ParagraphStyle(name="SmallX", fontName="DejaVu", fontSize=7.5, leading=10.5, textColor=MUTED))
styles.add(ParagraphStyle(name="CardTitle", fontName="DejaVu-Bold", fontSize=9.5, leading=12, textColor=INK, spaceAfter=4))
styles.add(ParagraphStyle(name="CardBody", fontName="DejaVu", fontSize=7.7, leading=11, textColor=MUTED))
styles.add(ParagraphStyle(name="WhiteTitle", fontName="DejaVu-Bold", fontSize=12, leading=15, textColor=WHITE, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="WhiteBody", fontName="DejaVu", fontSize=7.5, leading=10, textColor=colors.HexColor("#E9DDFF"), alignment=TA_CENTER))

def p(text, style="BodyX"):
    return Paragraph(text, styles[style])

def bullet(text):
    return Paragraph(f'<font color="#7C3AED">●</font>&nbsp;&nbsp;{text}', styles["BodyX"])

def card(title, body, width=82*mm):
    t = Table([[p(title, "CardTitle")], [p(body, "CardBody")]], colWidths=[width], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), WHITE), ("BOX", (0,0), (-1,-1), .7, LINE),
        ("LEFTPADDING", (0,0), (-1,-1), 12), ("RIGHTPADDING", (0,0), (-1,-1), 12),
        ("TOPPADDING", (0,0), (-1,0), 10), ("BOTTOMPADDING", (0,-1), (-1,-1), 10),
    ]))
    return t

class FlowDiagram(Flowable):
    def __init__(self, nodes, edges, height=180, columns=4):
        super().__init__(); self.nodes=nodes; self.edges=edges; self.height=height; self.columns=columns
    def wrap(self, availWidth, availHeight): self.width=availWidth; return availWidth, self.height
    def draw(self):
        c=self.canv; pad=8; gap=12; rows=(len(self.nodes)+self.columns-1)//self.columns
        boxw=(self.width-2*pad-gap*(self.columns-1))/self.columns; boxh=46
        positions=[]
        for i,(title,sub,kind) in enumerate(self.nodes):
            row=i//self.columns; col=i%self.columns
            x=pad+col*(boxw+gap); y=self.height-20-(row+1)*boxh-row*32
            positions.append((x,y,boxw,boxh))
        c.setStrokeColor(colors.HexColor("#CFC6D9")); c.setLineWidth(1)
        for a,b in self.edges:
            x1,y1,w1,h1=positions[a]; x2,y2,w2,h2=positions[b]
            sx=x1+w1/2; sy=y1 if y2<y1 else y1+h1; ex=x2+w2/2; ey=y2+h2 if y2<y1 else y2
            if abs(y1-y2)<4: sx=x1+w1; sy=y1+h1/2; ex=x2; ey=y2+h2/2
            c.line(sx,sy,ex,ey); c.setFillColor(PURPLE); c.circle(ex,ey,1.8,fill=1,stroke=0)
        for i,(title,sub,kind) in enumerate(self.nodes):
            x,y,w,h=positions[i]; fill=PURPLE if kind=="primary" else (LILAC if kind=="accent" else WHITE)
            c.setFillColor(fill); c.setStrokeColor(PURPLE if kind!="plain" else LINE); c.roundRect(x,y,w,h,8,fill=1,stroke=1)
            c.setFillColor(WHITE if kind=="primary" else INK); c.setFont("DejaVu-Bold",7.8); c.drawCentredString(x+w/2,y+h-16,title)
            c.setFillColor(colors.HexColor("#E9DDFF") if kind=="primary" else MUTED); c.setFont("DejaVu",6.1)
            lines=sub.split("|")[:2]
            for j,line in enumerate(lines): c.drawCentredString(x+w/2,y+13-j*8,line[:38])

def header_footer(canvas, doc):
    canvas.saveState(); w,h=A4
    canvas.setFillColor(PURPLE); canvas.rect(0,h-4, w,4,fill=1,stroke=0)
    canvas.setFont("DejaVu-Bold",7); canvas.setFillColor(MUTED); canvas.drawString(20*mm, 12*mm, "CONVERTLY  /  SİSTEM REHBERİ")
    canvas.setFont("DejaVu",7); canvas.drawRightString(w-20*mm,12*mm,f"{doc.page:02d}")
    canvas.restoreState()

doc = BaseDocTemplate(str(OUT), pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=22*mm, bottomMargin=20*mm,
                      title="Convertly Sistem Mimarisi ve Güvenlik Rehberi", author="Convertly")
frame=Frame(doc.leftMargin,doc.bottomMargin,doc.width,doc.height,id="normal")
doc.addPageTemplates(PageTemplate(id="main",frames=frame,onPage=header_footer))
story=[]

# Cover
story += [Spacer(1,22*mm), p("TEKNİK MİMARİ • GİZLİLİK • GÜVENLİK", "Kicker"), p("Convertly nasıl çalışır?", "TitleX"),
          p("Dosya dönüşümünden Belge AI'a, hesap güvenliğinden şifreli depolamaya kadar sistemin uçtan uca çalışma rehberi.", "BodyX"), Spacer(1,10*mm)]
hero=Table([[p("Sürüm", "WhiteBody"),p("Kapsam", "WhiteBody"),p("Durum", "WhiteBody")],
            [p("02 Eylül 2026", "WhiteTitle"),p("Üretim mimarisi", "WhiteTitle"),p("2FA dahil", "WhiteTitle")]], colWidths=[doc.width/3]*3)
hero.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),PURPLE),("BOX",(0,0),(-1,-1),0,PURPLE),("INNERGRID",(0,0),(-1,-1),.4,colors.HexColor("#9B72F4")),("TOPPADDING",(0,0),(-1,-1),12),("BOTTOMPADDING",(0,0),(-1,-1),12)]))
story += [hero, Spacer(1,14*mm), p("Bu belge neyi açıklar?", "H2X")]
for t in ["Kullanıcının dosyası hangi bileşenlerden geçer?", "Hangi üçüncü taraf servisler hangi amaçla kullanılır?", "Kaynak dosya, çıkarılmış metin ve çıktı dosyası nerede tutulur?", "Şifreleme, oturum, e-posta doğrulaması ve veri silme nasıl işler?"]: story.append(bullet(t))
story += [Spacer(1,14*mm), p("Kısa güvenlik özeti", "H2X"), card("Varsayılan yaklaşım", "En az veri, kullanıcıya bağlı erişim ve açık veri sınırları. Kaynak dosyalar işlem sırasında geçicidir; saklanan sonuçlar kullanıcıya özel AES-256-GCM ile şifrelenir.", doc.width), PageBreak()]

# Architecture
story += [p("01  /  GENEL MİMARİ", "Kicker"), p("Bir istek sistemde nasıl ilerler?", "H1X"), p("Convertly hibrit çalışır: uygun işlemler tarayıcıda, yerel çalışamayacak belge işlemleri Railway işçisinde, hesap ve API akışları Vercel üzerindeki Next.js uygulamasında yürür.")]
nodes=[("Kullanıcı", "Tarayıcı arayüzü", "primary"),("Next.js / Vercel", "Sayfalar ve API rotaları", "accent"),("Tarayıcı motoru", "Yerel görsel / medya / ZIP", "plain"),("Railway işçisi", "LibreOffice / OCR / PDF", "plain"),("Supabase", "Hesap / oturum / geçmiş", "plain"),("AWS S3", "Şifreli sonuç nesneleri", "plain"),("OpenRouter", "Yalnızca çıkarılmış içerik", "plain"),("Brevo", "Kayıt ve 2FA e-postası", "plain")]
story += [Spacer(1,5*mm), FlowDiagram(nodes,[(0,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7)],height=170,columns=4), Spacer(1,4*mm)]
data=[[card("Web katmanı", "Next.js 16 + React 19; Vercel üzerinde arayüz, oturum kontrollü API'ler ve depolama orkestrasyonu.",78*mm), card("Dönüşüm katmanı", "Railway Docker imajı: LibreOffice, Poppler, pdf2docx, Tesseract Türkçe/İngilizce OCR.",78*mm)],
      [card("Veri katmanı", "Supabase PostgreSQL + Drizzle; AWS S3 özel bucket. Dosya içeriği veritabanına yazılmaz.",78*mm),card("AI ve iletişim", "OpenRouter model geçidi; Brevo işlem e-postaları. Her ikisi yalnızca gereken iş akışında çağrılır.",78*mm)]]
t=Table(data,colWidths=[doc.width/2]*2,rowHeights=[34*mm,34*mm]); t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),3),("RIGHTPADDING",(0,0),(-1,-1),3),("TOPPADDING",(0,0),(-1,-1),3)])); story += [t,PageBreak()]

# Conversion
story += [p("02  /  DOSYA DÖNÜŞÜMÜ", "Kicker"),p("Yerel ve sunucu akışları", "H1X"),p("İşlem yolu dosya türüne ve gizli mod seçimine göre belirlenir. Kullanıcıdan Docker kurulumu beklenmez; üretimde belge motoru Railway üzerinde çalışır.")]
nodes=[("Dosya seçimi", "Tür / boyut kontrolü", "primary"),("Gizli mod?", "Destekleniyor mu?", "accent"),("Tarayıcı", "RAM içinde yerel işlem", "plain"),("Vercel API", "Yetkili yönlendirme", "plain"),("Railway", "İzole geçici klasör", "plain"),("Dönüşüm", "LibreOffice / PDF araçları", "plain"),("Şifreleme", "AES-256-GCM", "accent"),("İndirme", "Sahiplik doğrulaması", "primary")]
story += [Spacer(1,5*mm),FlowDiagram(nodes,[(0,1),(1,2),(1,3),(3,4),(4,5),(5,6),(2,7),(6,7)],height=170,columns=4)]
story += [p("Tarayıcıda çalışan işlemler", "H2X"), bullet("Desteklenen görsel, ses, video ve ZIP işlemleri bellekte yapılabilir. Gizli modda dosya, geçmiş kaydı ve çıktı sunucuya gönderilmez."),
          p("Sunucu gerektiren işlemler", "H2X"), bullet("DOCX/PPTX/XLSX/CSV/HTML → PDF ile PDF → DOCX/HTML gibi işlemler Vercel'den paylaşılan servis belirteciyle Railway'e aktarılır."), bullet("Her istek için benzersiz geçici klasör açılır; başarılı veya hatalı sonuçtan sonra klasör silinir."),
          p("Kalite notu", "H2X"), bullet("Dönüşüm motorları düzeni mümkün olduğunca korur; PDF sabit yerleşimli bir son format olduğu için karmaşık tablolar, özel fontlar ve katmanlı tasarımlar düzenlenebilir DOCX/HTML'e çevrilirken yüzde yüz piksel eşliği garanti edilemez."), PageBreak()]

# AI
story += [p("03  /  BELGE AI", "Kicker"),p("Dosyanın kendisi modele gönderilmez", "H1X"),p("AI sınırı açıktır: dosya Convertly tarafından doğrulanıp ayrıştırılır; OpenRouter'a yalnızca kullanıcının seçtiği işlem için gereken metin veya yapılandırılmış tablo bölümleri gönderilir.")]
nodes=[("PDF / DOCX / HTML", "TXT / XLSX / XLS / CSV", "primary"),("Convertly ayrıştırıcı", "MIME + imza + boyut", "accent"),("Metin çıkarımı", "OCR gerektiğinde Railway", "plain"),("Parçalama", "En fazla 300 bin karakter", "plain"),("İlgili bölümler", "Soruya göre seçilir", "plain"),("OpenRouter", "Metin / tablo bağlamı", "accent"),("AI sonucu", "Özet / çeviri / analiz", "plain"),("Çıktı", "PDF / DOCX + şifreli S3", "primary")]
story += [Spacer(1,5*mm),FlowDiagram(nodes,[(0,1),(1,2),(2,3),(3,4),(4,5),(5,6),(6,7)],height=170,columns=4)]
story += [p("Belgeye bağlı soru-cevap", "H2X"), bullet("Soru için belge parçaları puanlanır ve en ilgili bölümler seçilir. Sistem istemi, modelin belge dışı konulara cevap vermemesini ister."),
          p("Uzun içerikler", "H2X"), bullet("Özet ve çeviri parçalı yürütülür; parça özetleri son adımda tekrarları kaldırılarak birleştirilir. Yanıt uzunluk sınırında kesilirse devam isteği yapılır."),
          p("Kullanıcıya düşen doğrulama", "H2X"), bullet("AI çıktısı olasılıksaldır. Hukuki, finansal, tıbbi veya operasyonel kritik bilgiler kaynak belgeyle karşılaştırılmalıdır."),
          KeepTogether([p("Şeffaflık sınırı", "H2X"),card("OpenRouter ve model sağlayıcısı", "Model OPENROUTER_MODEL ortam değişkeniyle seçilir. Saklama ve model geliştirme koşulları seçilen sağlayıcıya bağlıdır; hassas içerik AI özelliğine yüklenmemelidir.",doc.width)]),PageBreak()]

# Auth
story += [p("04  /  KİMLİK DOĞRULAMA", "Kicker"),p("Şifre + isteğe bağlı e-posta 2FA", "H1X"),p("Kayıtta e-posta sahipliği doğrulanır. Kullanıcı profilinden 2FA'yı açarsa her yeni girişte doğru şifreden sonra ikinci bir e-posta kodu gerekir.")]
nodes=[("E-posta + şifre", "Giriş isteği", "primary"),("bcrypt kontrolü", "Düz metin saklanmaz", "accent"),("2FA açık mı?", "Kullanıcı tercihi", "plain"),("Brevo", "6 haneli kod", "plain"),("Kod doğrulama", "10 dakika / JWE", "accent"),("Oturum üretimi", "32 bayt rastgele belirteç", "plain"),("Veritabanı", "Yalnızca SHA-256 özeti", "plain"),("httpOnly çerez", "Secure + SameSite", "primary")]
story += [Spacer(1,5*mm),FlowDiagram(nodes,[(0,1),(1,2),(2,3),(3,4),(2,5),(4,5),(5,6),(6,7)],height=170,columns=4)]
story += [p("2FA'nın çalışma biçimi", "H2X"), bullet("Kod kriptografik rastgele sayı üretecinden 6 haneli oluşturulur ve Brevo API ile kayıtlı e-posta adresine iletilir."), bullet("Bekleyen giriş bilgisi AES-256-GCM korumalı JWE çerezindedir; kod doğrulanana kadar normal oturum oluşturulmaz."), bullet("Kod 10 dakika geçerlidir. Başarılı doğrulamadan sonra bekleyen giriş çerezi temizlenir."),
          p("Oturum güvenliği", "H2X"), bullet("Oturum belirteci 32 bayt rastgele üretilir; veritabanında yalnızca SHA-256 özeti tutulur. Tarayıcı çerezi JavaScript'e kapalıdır ve üretimde HTTPS ile gönderilir."),PageBreak()]

# Storage
story += [p("05  /  DEPOLAMA VE ŞİFRELEME", "Kicker"),p("Sonuç dosyası kullanıcıya özel korunur", "H1X"),p("Veritabanı dosyanın kendisini değil, geçmiş ve nesne anahtarı gibi metaverileri tutar. İndirilebilir çıktı özel S3 bucket'ında şifreli nesne olarak saklanır.")]
nodes=[("Çıktı baytları", "Dönüşüm / AI sonucu", "primary"),("Kullanıcı anahtarı", "HKDF-SHA256 türetimi", "accent"),("AES-256-GCM", "12 bayt IV + doğrulama etiketi", "accent"),("Özel AWS S3", "application/octet-stream", "plain"),("Supabase kaydı", "Kullanıcı + sonuç anahtarı", "plain"),("İndirme isteği", "Oturum + sahiplik", "plain"),("Şifre çözme", "Sunucuda, doğru kullanıcıyla", "plain"),("Dosya yanıtı", "Orijinal içerik türü", "primary")]
story += [Spacer(1,5*mm),FlowDiagram(nodes,[(0,1),(1,2),(2,3),(3,4),(4,5),(5,6),(6,7)],height=170,columns=4)]
story += [p("Kriptografik zarf", "H2X"),bullet("Ana FILE_ENCRYPTION_KEY doğrudan dosya anahtarı olarak kullanılmaz. HKDF-SHA256, kullanıcı kimliği ve sabit bağlam ile her kullanıcı için ayrı 256 bit anahtar türetir."),bullet("AES-GCM hem gizlilik hem bütünlük sağlar; yanlış anahtar veya değiştirilmiş şifreli nesne doğrulamayı geçemez."),
          p("Erişim kontrolü", "H2X"),bullet("S3 nesne yolları users/{kullanıcı}/... şeklinde ayrılır; bucket genel erişime kapalı tutulur. İndirme API'si geçerli oturumu ve dönüşüm kaydının sahipliğini tekrar denetler."),
          p("Silme ve dışa aktarma", "H2X"),bullet("Kullanıcı geçmişini ve dosyalarını silebilir, hesabını tüm bağlı verilerle kaldırabilir veya mevcut hesap verilerini ve erişilebilir sonuçları ZIP olarak indirebilir."),PageBreak()]

# APIs
story += [p("06  /  SERVİSLER VE API'LER", "Kicker"),p("Hangi servis neden kullanılıyor?", "H1X")]
rows=[[p("Bileşen","CardTitle"),p("Görevi","CardTitle"),p("Gönderilen veri","CardTitle")],
      [p("Supabase PostgreSQL","CardTitle"),p("Kullanıcı, hashlenmiş oturum, dönüşüm geçmişi ve nesne anahtarı.","CardBody"),p("Dosya içeriği değil; hesap ve geçmiş metaverisi.","CardBody")],
      [p("AWS S3","CardTitle"),p("Tekrar indirilebilir sonuçların özel nesne depolaması.","CardBody"),p("Convertly tarafından önceden AES-256-GCM ile şifrelenmiş çıktı.","CardBody")],
      [p("Railway","CardTitle"),p("LibreOffice, pdf2docx, Poppler ve Tesseract gerektiren ağır dönüşüm.","CardBody"),p("İşlem için kaynak dosya; işlem sonunda geçici klasör silinir.","CardBody")],
      [p("OpenRouter","CardTitle"),p("Özetleme, çeviri, tablo analizi ve belgeye bağlı soru-cevap.","CardBody"),p("Kaynak dosya değil; ayrıştırılmış metin veya tablo bölümleri.","CardBody")],
      [p("Brevo","CardTitle"),p("Kayıt doğrulaması ve isteğe bağlı giriş 2FA e-postaları.","CardBody"),p("Alıcı e-posta, ad, 6 haneli kod ve e-posta şablonu.","CardBody")],
      [p("Vercel","CardTitle"),p("Next.js web uygulaması ve sunucusuz API orkestrasyonu.","CardBody"),p("Kullanıcının başlattığı istekler; sırlar ortam değişkenlerinde.","CardBody")]]
t=Table(rows,colWidths=[37*mm,65*mm,65*mm],repeatRows=1); t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),INK),("TEXTCOLOR",(0,0),(-1,0),WHITE),("GRID",(0,0),(-1,-1),.5,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8),("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE,SOFT])]))
story += [t,Spacer(1,7*mm),p("Önemli uygulama rotaları", "H2X"),bullet("/api/auth/* — kayıt, giriş, doğrulama ve çıkış"),bullet("/api/convert/office — Office, PDF ve HTML dönüşüm orkestrasyonu"),bullet("/api/ai/* — ayrıştırma, belge işlemleri ve çıktı kaydı"),bullet("/api/conversions/* — geçmiş ve sahiplik kontrollü yeniden indirme"),bullet("/api/me/* — profil, güvenlik tercihi, veri dışa aktarma ve silme"),PageBreak()]

# Controls + conclusion
story += [p("07  /  GİZLİLİK VE OPERASYON", "Kicker"),p("Kontroller, sınırlar ve sorumluluklar", "H1X")]
matrix=[[card("Veri minimizasyonu", "AI'a dosya yerine gerekli çıkarılmış içerik; gizli modda sunucuya veri yok.",50*mm),card("Sır yönetimi", "API anahtarları ve şifreleme anahtarı yalnızca sunucu ortam değişkenlerinde.",50*mm),card("En az ayrıcalık", "S3 IAM yetkileri tek özel bucket ve gereken nesne işlemleriyle sınırlandırılmalı.",50*mm)],
        [card("Silinebilirlik", "Geçmiş/dosya silme, hesap silme ve veri dışa aktarma kullanıcı kontrolünde.",50*mm),card("İzole işlem", "Geçici klasörler istek bazında açılır ve finally adımında temizlenir.",50*mm),card("Doğrulama", "MIME, uzantı, dosya imzası, boyut, oturum ve sahiplik denetimleri.",50*mm)]]
t=Table(matrix,colWidths=[doc.width/3]*3,rowHeights=[39*mm,39*mm]); t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),3),("RIGHTPADDING",(0,0),(-1,-1),3),("TOPPADDING",(0,0),(-1,-1),3)])); story += [t,Spacer(1,7*mm)]
story += [p("Uygulanan teknik sınırlar", "H2X"),bullet("Genel dönüşüm yüklemeleri en fazla 100 MB; Belge AI yüklemeleri en fazla 25 MB ve çıkarılmış içerik en fazla yaklaşık 300.000 karakterdir."),bullet("Şifreli veya bozuk belgeler işlenmeyebilir. OCR ilk 30 PDF sayfasıyla sınırlandırılmıştır."),bullet("Sistem güvenliği yalnızca uygulama koduna bağlı değildir: Vercel, Railway, Supabase, AWS, Brevo ve OpenRouter erişim anahtarlarının düzenli döndürülmesi ve panellerde en az yetkiyle tutulması gerekir."),
          p("Belgenin kapsamı", "H2X"),card("Teknik açıklama — sertifika değildir", "Bu rehber 02 Eylül 2026 tarihinde depodaki uygulama kodunun ve yapılandırılmış üretim mimarisinin açıklamasıdır. Bağımsız sızma testi, ISO 27001 veya KVKK/GDPR uygunluk belgesi yerine geçmez.",doc.width),
          Spacer(1,8*mm),card("Convertly", "Hızlı dosya dönüşümü, belgeye bağlı AI ve kullanıcı kontrollü güvenli saklama.", doc.width)]

doc.build(story)
print(OUT)
