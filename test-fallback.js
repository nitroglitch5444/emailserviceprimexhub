const body = `DKIM-Signature: v=1; a=rsa-sha256; q=dns/txt; c=relaxed/relaxed;
	d=scriptblox.com; s=default; h=Content-Type:MIME-Version:Date:
	Content-Transfer-Encoding:Message-ID:Subject:To:From:Sender:Reply-To:Cc:
	Content-ID:Content-Description:Resent-Date:Resent-From:Resent-Sender:
	Resent-To:Resent-Cc:Resent-Message-ID:In-Reply-To:References:List-Id:
	List-Help:List-Unsubscribe:List-Subscribe:List-Post:List-Owner:List-Archive;
	bh=oQrVcOoFQw1FdMfuoS3rKm+bZ5xDTT90/8dlJYNpRLs=; b=hTmvlZy0XGcbzft9+73pRG47IE
	+/xbj55vBhkrpRqDRa7xI/qzZ7256vOKtQr7jrA58EfRdAcR9hXyt86zDgnQPXXhjsGiJmb4y2OWX
	HqQgV13de0dsu+DNtkSRkwQwnHjUdkXbBmKjqdXXzUanVJAuwcBVWrnxPBWccyRcXHRU0bkxM8ut7
	1OmcvjLxPd
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: quoted-printable

<!DOCTYPE html><html lang=3D"en"><head><title>Test</title></head><body><h1>Hello</h1></body></html>`;

let parsedHtml = '';
const htmlStartIndex = body.indexOf('<!DOCTYPE html>');
const htmlStartIndex2 = body.indexOf('<html');

const startIndex = htmlStartIndex !== -1 ? htmlStartIndex : (htmlStartIndex2 !== -1 ? htmlStartIndex2 : -1);

if (startIndex !== -1) {
  parsedHtml = body.substring(startIndex);
  
  if (parsedHtml.includes('=\r\n') || parsedHtml.includes('=\n') || parsedHtml.includes('=3D')) {
    parsedHtml = parsedHtml
      .replace(/=\r\n/g, '')
      .replace(/=\n/g, '')
      .replace(/=3D/g, '=')
      .replace(/=20/g, ' ')
      .replace(/=09/g, '\t')
      .replace(/=C2=A9/g, '©');
  }
}

console.log(parsedHtml);
