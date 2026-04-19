import { simpleParser } from 'mailparser';
const raw = `DKIM-Signature: v=1; a=rsa-sha256; q=dns/txt; c=relaxed/relaxed;
	d=scriptblox.com; s=default; h=Content-Type:MIME-Version:Date:
	Content-Transfer-Encoding:Message-ID:Subject:To:From:Sender:Reply-To:Cc:
	Content-ID:Content-Description:Resent-Date:Resent-From:Resent-Sender:
	Resent-To:Resent-Cc:Resent-Message-ID:In-Reply-To:References:List-Id:
	List-Help:List-Unsubscribe:List-Subscribe:List-Post:List-Owner:List-Archive;
	bh=oQrVcOoFQw1FdMfuoS3rKm+bZ5xDTT90/8dlJYNpRLs=; b=hTmvlZy0XGcbzft9+73pRG47IE
	+/xbj55vBhkrpRqDRa7xI/qzZ7256vOKtQr7jrA58EfRdAcR9hXyt86zDgnQPXXhjsGiJmb4y2OWX
	HqQgV13de0dsu+DNtkSRkwQwnHjUdkXbBmKjqdXXzUanVJAuwcBVWrnxPBWccyRcXHRU0bkxM8ut7
	1OmcvjLxPd1TyJ063zIEkxIbiSSdX25BP7SAROXOUOu6NgjQpBRd3wgMIpaotxbYLlFy2O99YxBRf
	WmIqD12Yh+8yQPXSIkKaaQ3kxcgCD06PzarcW0mytxahsmuQ6Ye8s/tvO/1kvRXsUGP5dxrQnKGC1
	RqsDrtog==;
Received: from ns5005848.ip-51-222-244.net ([51.222.244.42]:38388 helo=[127.0.0.1])
	by vps-d39e7fca.vps.ovh.ca with esmtpsa  (TLS1.3) tls TLS_AES_256_GCM_SHA384
	(Exim 4.99.1)
	(envelope-from <support@scriptblox.com>)
	id 1w7DD0-00000007uzU-1ZK9
	for skillho@primexhub.shop;
	Mon, 30 Mar 2026 14:03:13 +0000
From: ScriptBlox <support@scriptblox.com>
To: skillho@primexhub.shop
Subject: Account verification
Message-ID: <7796bed1-04f0-cb78-9b3a-991f9c2cdaae@scriptblox.com>
Content-Transfer-Encoding: quoted-printable
Date: Mon, 30 Mar 2026 14:03:13 +0000
MIME-Version: 1.0
Content-Type: text/html; charset=utf-8

<!DOCTYPE html><html lang=3D"en"><head><title>Test</title></head><body><p>Hello=3DWorld</p></body></html>
`;
simpleParser(raw).then(parsed => console.log("Subject:", parsed.subject, "HTML:", parsed.html)).catch(console.error);
