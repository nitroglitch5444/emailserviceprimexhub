import { simpleParser } from 'mailparser';

const rawEmail = `DKIM-Signature: v=1; a=rsa-sha256; q=dns/txt; c=relaxed/relaxed;
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

<html><body><h1>Hello</h1><p>This is a test.</p></body></html>`;

simpleParser(rawEmail).then(parsed => {
  console.log("HTML:", parsed.html);
  console.log("Text:", parsed.text);
}).catch(console.error);
