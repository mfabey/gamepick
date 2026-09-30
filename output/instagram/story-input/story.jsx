export default async ({ project }) => {
  const p = await project({dir:'/home/user/gamerisen-story',size:'1080x1920',fps:30,background:'#0A0B0D'});
  const logo=await p.add('/home/user/story-input/logo.png');
  const home=await p.add('/home/user/story-input/home.jpg');
  const discover=await p.add('/home/user/story-input/discover.jpg');
  const price=await p.add('/home/user/story-input/price.jpg');
  const community=await p.add('/home/user/story-input/community.jpg');
  const music=await p.add('/home/user/story-input/music.wav');
  p.cut(music,{at:0,dur:19.2});
  const txt=(s,x,y,w,size=38,color='#F4F4F6',weight=500)=> <text x={x} y={y} width={w} height={size*1.5} fontFamily="Inter" fontSize={size} fontWeight={weight} color={color}>{s}</text>;
  const motion={enter:{from:{y:30,opacity:0,scale:.97},duration:.55,easing:'house'},exit:{to:{y:-16,opacity:0},duration:.25}};
  p.compose(<>
    <rect width={1080} height={1920} fill={{kind:'linear',angle:120,stops:[{offset:0,color:'#0A0B0D'},{offset:.55,color:'#161114'},{offset:1,color:'#0A0B0D'}]}}/>
    <rect x={72} y={1790} width={936} height={1} fill="#24262C"/>
    <media file={logo} x={74} y={216} width={56} height={56} fit="contain"/>
    {txt('GAMERISEN',145,228,460,27,'#F4F4F6',700)}
    {txt('YENİ SÜRÜM',792,232,220,22,'#FF6B6F',600)}
    {txt('gamerisen.com',72,1690,650,28,'#A1A3AB',400)}
    <rect x={72} y={1750} width={936} height={3} fill="#2A2C33"/>
    <rect x={72} y={1750} width={936} height={3} fill="#E8242B" animate={[{property:'scaleX',from:.001,to:1,duration:19.2,easing:'linear'}]}/>
  </>,{at:0,dur:19.2,name:'Brand and background'});
  const scenes=[
    {at:0,dur:4.2,img:home,title:'Yeni görünüm. Aynı oyun tutkusu.',label:'YENİ TASARIM',head:'Sade. Akıcı. Sana yakın.',sub:'Yenilenen arayüzle keşfetmeye başla.',side:72},
    {at:4.2,dur:4,img:discover,title:'Sıradaki oyunun seni bekliyor.',label:'SANA ÖZEL',head:'Zevkine göre oyunlar.',sub:'İlgini çeken oyunları tek yerde keşfet.',side:248},
    {at:8.2,dur:4,img:price,title:'Karşılaştır. Fırsatı yakala.',label:'GELİŞTİRİLEN ÖZELLİK',head:'Daha fazla mağaza.',sub:'Oyun fiyatlarını yan yana karşılaştır.',side:72},
    {at:12.2,dur:4,img:community,title:'Oyunlar güzel. Birlikte daha güzel.',label:'OYUNCU TOPLULUĞU',head:'Keşfet. Paylaş. Sohbet et.',sub:'Oyun tutkununu toplulukla paylaş.',side:248},
    {at:16.2,dur:3,img:home,title:'Gamerisen yenilendi.',label:'ŞİMDİ KEŞFET',head:'Yeni sürüme geç.',sub:'Bir sonraki oyununu birlikte bulalım.',side:160},
  ];
  for (let i=0;i<scenes.length;i++){
    const s=scenes[i];
    p.compose(<>
      <frame x={72} y={314} width={948} height={90} layout="none" motion={{enter:{from:{y:18,opacity:0},duration:.4},exit:{to:{opacity:0},duration:.2}}>
        {txt(s.title,0,0,948,i===3?46:48,'#F4F4F6',650)}
      </frame>
      <frame x={263} y={434} width={554} height={1234} layout="none" motion={{enter:{from:{y:30,opacity:0,scale:.96},duration:.65,easing:'house'},exit:{to:{opacity:0,scale:1.01},duration:.25}}>
        <rect x={-4} y={0} width={562} height={1230} radius={68} fill="#292B30" shadow={{x:0,y:22,blur:45,color:'#00000099'}}/>
        <rect x={0} y={4} width={554} height={1222} radius={64} fill="#101114" strokeColor="#585A61" strokeWidth={2}/>
        <media file={s.img} x={14} y={20} width={526} height={1185} fit="cover" radius={48}/>
        <rect x={261} y={32} width={25} height={25} radius={13} fill="#040507"/>
        <rect x={-9} y={250} width={6} height={80} radius={3} fill="#44464D"/>
        <rect x={558} y={300} width={6} height={120} radius={3} fill="#44464D"/>
      </frame>
      <frame x={s.side} y={1336} width={760} height={220} layout="none" at={.75} duration={s.dur-.8} motion={motion}>
        <rect width={760} height={220} radius={28} fill="#181A20" strokeColor="#383A43" strokeWidth={1.5} shadow={{x:0,y:15,blur:32,color:'#000000AA'}}/>
        <rect x={0} y={27} width={4} height={166} radius={2} fill="#E8242B"/>
        {txt(s.label,32,27,694,21,'#FF6B6F',700)}
        {txt(s.head,32,74,694,42,'#F4F4F6',650)}
        {txt(s.sub,32,141,694,29,'#B9BBC4',400)}
      </frame>
      {i===4?<frame x={618} y={1665} width={390} height={74} layout="none" at={.5} duration={2.5} motion={{enter:{from:{y:10,opacity:0},duration:.4}}}>
        <rect width={390} height={74} radius={22} fill="#D01A21"/>
        <text x={0} y={20} width={390} height={44} align="center" fontFamily="Inter" fontSize={27} fontWeight={600} color="#FFFFFF">Yeni sürümü keşfet →</text>
      </frame>:null}
    </>,{at:s.at,dur:s.dur,name:`Scene ${i+1}`});
  }
  await p.frame(2,'renders/preview.png');
  await p.render('renders/gamerisen-story.mp4',{bitrate:8000000,shards:4,concurrency:2});
};
