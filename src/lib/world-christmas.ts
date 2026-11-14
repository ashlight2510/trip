export type ChristmasRegion = "유럽" | "아시아" | "아메리카" | "아프리카" | "오세아니아";

export type ChristmasFood = {
  name: string;
  localName?: string;
  description: string;
};

export type ChristmasEvent = {
  name: string;
  dateHint: string;
  description: string;
};

export type CountryChristmas = {
  id: string;
  nameKo: string;
  nameEn: string;
  region: ChristmasRegion;
  greeting: string;
  seasonLabel: string;
  celebrationWindow: string;
  headline: string;
  summary: string;
  image: string;
  imageAlt: string;
  imageCaption: string;
  foods: ChristmasFood[];
  events: ChristmasEvent[];
  funFact: string;
};

export type TimelineMilestone = {
  date: string;
  country: string;
  title: string;
  detail: string;
};

export const CHRISTMAS_REGIONS: ChristmasRegion[] = ["유럽", "아시아", "아메리카", "아프리카", "오세아니아"];

export const WORLD_CHRISTMAS_COUNTRIES: CountryChristmas[] = [
  {
    id: "germany",
    nameKo: "독일",
    nameEn: "Germany",
    region: "유럽",
    greeting: "Frohe Weihnachten!",
    seasonLabel: "한겨울 · 눈 오는 광장",
    celebrationWindow: "대림절 4주 ~ 12월 26일",
    headline: "나무 오두막 마켓의 불빛, 불타는 럼 설탕과 슈톨렌",
    summary:
      "독일의 크리스마스는 11월 말 도심 광장에 세워지는 크리스마스 마켓과 함께 시작됩니다. 대림절 달력(Adventskalender)을 하루씩 열며 기다린 끝에, 가족들은 거위 구이와 향신료 빵으로 따뜻한 겨울밤을 보냅니다.",
    image: "/christmas/christmas-germany.jpg",
    imageAlt: "눈 내리는 독일 크리스마스 마켓 노점 앞 슈톨렌과 불타는 포이어찬겐보울레 일러스트",
    imageCaption: "눈 덮인 바이나흐츠마르크트 노점 앞 슈톨렌·레브쿠헨 하트와 불타는 포이어찬겐보울레",
    foods: [
      {
        name: "슈톨렌",
        localName: "Christstollen",
        description:
          "럼에 절인 건포도·말린 과일·마지판을 듬뿍 넣고 구워 슈거파우더를 하얗게 덮은 전통 빵. 강보에 싸인 아기 예수의 모습을 본땄다고 전해집니다.",
      },
      {
        name: "포이어찬겐보울레",
        localName: "Feuerzangenbowle",
        description:
          "계피·오렌지 껍질을 넣은 따뜻한 글뤼바인 위에 럼을 적신 설탕 원뿔(Zuckerhut)을 올리고 불을 붙여 캐러멜처럼 녹여 마시는 겨울 펀치입니다.",
      },
      {
        name: "레브쿠헨 & 거위 구이",
        localName: "Lebkuchen · Weihnachtsgans",
        description:
          "마켓의 하트 모양 진저브레드 레브쿠헨과, 크리스마스 당일 붉은 양배추·감자 만두를 곁들여 먹는 바삭한 거위 구이가 식탁의 중심입니다.",
      },
    ],
    events: [
      {
        name: "바이나흐츠마르크트",
        dateHint: "11월 말 ~ 12월 23일",
        description:
          "뉘른베르크·드레스덴 등 전국 광장에 목조 상점이 들어서 수공예 목각 오너먼트, 호두까기 인형, 따뜻한 글뤼바인을 팝니다.",
      },
      {
        name: "니콜라우스의 날 & 대림절 화환",
        dateHint: "12월 6일 · 매주 일요일",
        description:
          "12월 5일 밤 아이들이 문 밖에 구두를 내놓으면 성 니콜라우스가 사탕과 귤을 채워주고, 매주 일요일 대림절 초를 하나씩 더 밝힙니다.",
      },
    ],
    funFact:
      "트리 속에 초록색 유리 피클 장식을 몰래 숨겨두고 크리스마스 아침 가장 먼저 찾는 사람에게 선물을 주는 '크리스마스 피클'은 독일계 미국인 사회에서 유래했다는 설이 유력합니다.",
  },
  {
    id: "france",
    nameKo: "프랑스",
    nameEn: "France",
    region: "유럽",
    greeting: "Joyeux Noël!",
    seasonLabel: "겨울 · 촛불과 미식",
    celebrationWindow: "12월 24일 밤 ~ 25일",
    headline: "자정 미사 뒤 밤새 이어지는 레베용 만찬과 통나무 케이크",
    summary:
      "프랑스에서는 크리스마스 이브 늦은 밤부터 새벽까지 이어지는 미식 만찬 '레베용(Réveillon)'이 가장 큰 행사입니다. 알자스 지방을 비롯한 고풍스러운 거리와 벽난로 앞 장식에서 우아한 겨울 분위기가 묻어납니다.",
    image: "/christmas/christmas-france.jpg",
    imageAlt: "벽난로 앞 구두와 뷔슈 드 노엘, 생굴, 샴페인이 놓인 프랑스 레베용 식탁 일러스트",
    imageCaption: "벽난로 앞 신발과 함께 차려진 뷔슈 드 노엘, 얼음 위 생굴, 샴페인 만찬",
    foods: [
      {
        name: "뷔슈 드 노엘",
        localName: "Bûche de Noël",
        description:
          "한 해의 액운을 태우던 크리스마스 장작(Yule log) 풍습에서 유래한 롤케이크. 진한 초콜릿 버터크림으로 나무껍질 결을 살려 장식합니다.",
      },
      {
        name: "생굴 & 푸아그라",
        localName: "Huîtres · Foie gras",
        description:
          "레베용 전채로 빠지지 않는 신선한 굴 플래터와 무화과 잼·브리오슈를 곁들인 푸아그라, 훈제 연어가 샴페인과 함께 올라갑니다.",
      },
      {
        name: "밤 스터핑 칠면조 · 트러플 요리",
        localName: "Dinde aux marrons",
        description:
          "고소한 밤과 허브로 속을 채운 가금류 로스트와 지역별 13가지 디저트(프로방스 전통)로 밤을 길게 누립니다.",
      },
    ],
    events: [
      {
        name: "레베용",
        dateHint: "12월 24일 자정 이후",
        description:
          "'깨어 있음'을 뜻하는 이름처럼 자정 미사 전후로 온 가족이 모여 여러 코스의 요리를 천천히 음미하며 새벽까지 대화를 나눕니다.",
      },
      {
        name: "벽난로 앞 구두 놓기",
        dateHint: "12월 24일 밤",
        description:
          "프랑스 아이들은 양말 대신 깨끗이 닦은 구두를 벽난로 옆에 나란히 놓아두며 페르 노엘(산타)이 선물을 채워주길 기다립니다.",
      },
    ],
    funFact:
      "프랑스 남부 프로방스 지역에서는 그리스도와 12사도를 상징해 말린 과일, 견과류, 누가, 귤 등 정확히 '13가지 디저트(Les Treize Desserts)'를 한 상에 올리는 전통이 있습니다.",
  },
  {
    id: "italy",
    nameKo: "이탈리아",
    nameEn: "Italy",
    region: "유럽",
    greeting: "Buon Natale!",
    seasonLabel: "겨울 · 광장과 성탄 구유",
    celebrationWindow: "12월 24일 ~ 1월 6일",
    headline: "이브의 해산물 만찬부터 파네토네, 그리고 1월의 마녀 베파나",
    summary:
      "이탈리아는 고기 없이 해산물로 풍성하게 차리는 이브 저녁 '라 비질리아'로 문을 열어, 1월 6일 주현절에 빗자루를 탄 할머니 마녀 '베파나'가 선물을 나눠줄 때까지 긴 축제 기간을 즐깁니다.",
    image: "/christmas/christmas-italy.jpg",
    imageAlt: "파네토네와 판도로, 해산물 요리, 구유 장식과 밤하늘의 베파나가 그려진 이탈리아 크리스마스 일러스트",
    imageCaption: "파네토네·별 모양 판도로, 해산물 전채, 프레세페 구유와 하늘을 나는 라 베파나",
    foods: [
      {
        name: "파네토네 & 판도로",
        localName: "Panettone · Pandoro",
        description:
          "밀라노의 돔 모양 건과일 브리오슈 '파네토네'와 베로나의 8각 별 모양 버터 빵 '판도로'(슈거파우더를 뿌려 알프스 눈산을 닮음)가 양대 산맥입니다.",
      },
      {
        name: "라 비질리아 해산물 만찬",
        localName: "La Vigilia",
        description:
          "12월 24일 밤 고기를 피하는 전통에 따라 염장 대구(바칼라), 오징어, 조개, 새우 등 다채로운 생선·해산물 요리를 즐깁니다.",
      },
      {
        name: "라자냐 & 부첼라토",
        localName: "Lasagna · Buccellato",
        description:
          "25일 점심에는 따뜻한 라자냐와 육류 로스트가 오르고, 시칠리아에서는 무화과·아몬드·마르살라 와인이 들어간 링 케이크 부첼라토를 굽습니다.",
      },
    ],
    events: [
      {
        name: "프레세페 (성탄 구유 전시)",
        dateHint: "12월 전체",
        description:
          "나폴리 등지에서는 장인들이 손수 빚은 미니어처 인물과 마을 모형으로 아기 예수 탄생 장면을 집과 성당, 거리 곳곳에 꾸밉니다.",
      },
      {
        name: "라 베파나의 방문",
        dateHint: "1월 5~6일 주현절",
        description:
          "이탈리아 아이들은 산타뿐 아니라 빗자루를 타고 굴뚝으로 들어와 착한 아이에게 사탕, 장난꾸러기에겐 석탄(설탕 과자)을 주는 마녀 베파나를 기다립니다.",
      },
    ],
    funFact:
      "파네토네는 천연 발효종으로 반죽을 30시간 이상 숙성시켜야 특유의 깃털 같은 결이 살아나기 때문에, 이탈리아 가정에서도 대부분 명인 베이커리에서 사서 선물로 주고받습니다.",
  },
  {
    id: "poland",
    nameKo: "폴란드",
    nameEn: "Poland",
    region: "유럽",
    greeting: "Wesołych Świąt!",
    seasonLabel: "한겨울 · 첫 별이 뜨는 밤",
    celebrationWindow: "12월 24일 이브 저녁 (비길리아)",
    headline: "밤하늘 첫 별과 함께 시작하는 12가지 음식과 빈 자리 하나",
    summary:
      "폴란드의 크리스마스 이브 만찬 '비길리아(Wigilia)'는 가족 중 누군가 창밖에서 첫 번째 별을 발견해야 비로소 시작됩니다. 식탁보 아래 건초를 깔고, 뜻밖의 손님을 위한 여분의 그릇을 하나 더 놓는 깊은 환대 문화가 살아 있습니다.",
    image: "/christmas/christmas-poland.jpg",
    imageAlt: "창밖 첫 별 아래 비트 수프 바르슈치와 우슈카, 피에로기, 오프와테크가 놓인 폴란드 비길리아 식탁 일러스트",
    imageCaption: "첫 별이 뜬 눈 밤 창가, 하얀 오프와테크 웨이퍼와 루비빛 바르슈치·피에로기 식탁",
    foods: [
      {
        name: "바르슈치 & 우슈카",
        localName: "Barszcz wigilijny · Uszka",
        description:
          "비트를 맑게 우려낸 선명한 루비빛 수프에 '작은 귀'라는 뜻의 버섯 속 미니 만두 우슈카를 띄워 첫 코스로 먹습니다.",
      },
      {
        name: "12가지 무육 요리 (피에로기·잉어)",
        localName: "Pierogi · Karp",
        description:
          "1년 12달과 12사도를 상징해 육류 없이 사우어크라우트·버섯을 채운 피에로기와 잉어 요리, 양귀비씨 케이크 등 12가지를 맛봅니다.",
      },
      {
        name: "말린 과일 콤포트",
        localName: "Kompot z suszu",
        description:
          "전통적으로 이브 밤에는 술 대신 말린 사과·자두·배에 정향과 계피를 넣고 끓인 훈연 향의 달콤한 과일 음료를 마십니다.",
      },
    ],
    events: [
      {
        name: "오프와테크 나누기",
        dateHint: "12월 24일 식사 전",
        description:
          "성경 장면이 양각된 얇은 흰색 밀 웨이퍼(Opłatek)를 한 조각씩 떼어 나누며 서로에게 새해 건강과 용서의 덕담을 건넵니다.",
      },
      {
        name: "예상치 못한 손님을 위한 자리",
        dateHint: "12월 24일 밤",
        description:
          "추운 겨울밤 길을 잃은 나그네가 찾아와도 맞이할 수 있도록 식탁 한쪽을 비워두고 접시와 수저를 꼭 한 벌 더 놓아둡니다.",
      },
    ],
    funFact:
      "비길리아 메인 요리인 잉어를 손질할 때 나온 비늘을 깨끗이 씻어 지갑 속에 일 년 내내 간직하면 새해에 돈과 행운이 들어온다고 믿습니다.",
  },
  {
    id: "spain",
    nameKo: "스페인",
    nameEn: "Spain",
    region: "유럽",
    greeting: "¡Feliz Navidad!",
    seasonLabel: "초겨울 · 축제의 연속",
    celebrationWindow: "12월 22일 ~ 1월 6일",
    headline: "온 국민이 두근거리는 복권 '엘 고르도'와 1월의 동방박사 행진",
    summary:
      "스페인의 연말은 12월 22일 크리스마스 복권 추첨으로 화려하게 막이 오릅니다. 이브 가족 만찬(Nochebuena)은 물론, 산타가 아닌 '세 명의 동방박사'가 선물을 주는 1월 6일까지 축제가 멈추지 않습니다.",
    image: "/christmas/christmas-spain.jpg",
    imageAlt: "스페인 광장의 동방박사 퍼레이드 등불과 투론, 폴보론, 로스콘 데 레예스가 놓인 일러스트",
    imageCaption: "등불이 밝은 동방박사 퍼레이드 광장 앞 투론·폴보론과 보석 같은 로스콘 데 레예스",
    foods: [
      {
        name: "투론 & 폴보론",
        localName: "Turrón · Polvorón",
        description:
          "볶은 아몬드와 꿀·달걀흰자로 만든 고소한 누가 '투론'과 입안에서 눈처럼 사르르 부서지는 아몬드 쇼트브레드 '폴보론'이 대표 간식입니다.",
      },
      {
        name: "로스콘 데 레예스",
        localName: "Roscón de Reyes",
        description:
          "1월 6일 먹는 왕관 모양 브리오슈 빵. 빵 속에 작은 왕 인형과 콩이 숨겨져 있는데, 왕을 뽑으면 왕관을 쓰고 콩을 뽑으면 빵값을 냅니다.",
      },
      {
        name: "새우·구운 새끼 양·해산물 수프",
        localName: "Mariscos · Cordero asado",
        description:
          "이브 밤 가족 모임에는 싱싱한 갑각류 요리와 오븐에 천천히 구운 양고기·아기돼지 구이가 풍성하게 오릅니다.",
      },
    ],
    events: [
      {
        name: "엘 고르도 크리스마스 복권",
        dateHint: "12월 22일",
        description:
          "200년 넘는 역사를 지닌 세계 최대 규모 추첨 행사. 마드리드 산 일데폰소 학교 아이들이 당첨 번호를 노래로 부르는 생중계를 온 나라가 지켜봅니다.",
      },
      {
        name: "동방박사 퍼레이드",
        dateHint: "1월 5일 밤",
        description:
          "화려한 수레를 탄 동방박사들이 거리를 행진하며 아이들에게 사탕을 던져주고, 아이들은 잠들기 전 문 앞에 신발을 두어 선물을 받습니다.",
      },
    ],
    funFact:
      "카탈루냐 지방에는 웃는 얼굴을 그린 작은 통나무에 담요를 덮어두고 먹이를 주다 크리스마스 날 막대기로 두드리며 노래를 불러 과자와 선물을 뱉어내게 하는 유쾌한 '티오 데 나달(Tió de Nadal)' 풍습이 있습니다.",
  },
  {
    id: "iceland",
    nameKo: "아이슬란드",
    nameEn: "Iceland",
    region: "유럽",
    greeting: "Gleðileg jól!",
    seasonLabel: "극야 · 오로라와 난로",
    celebrationWindow: "12월 12일 ~ 1월 6일",
    headline: "책 선물이 홍수처럼 쏟아지는 밤과 13명의 장난꾸러기 요정",
    summary:
      "북극권 가까이 낮이 짧은 아이슬란드에서는 크리스마스 이브에 새 책을 선물 받아 핫초코와 함께 밤새 읽는 '욜라보카플로드(크리스마스 책 홍수)'가 국민적 풍습입니다. 산타도 한 명이 아니라 13명의 개성 넘치는 트롤 형제가 찾아옵니다.",
    image: "/christmas/christmas-iceland.jpg",
    imageAlt: "오로라가 비치는 아이슬란드 오두막 창가의 책 더미와 코코아, 라우파브뢰드, 훈제 양고기 일러스트",
    imageCaption: "오로라 창가 신발과 하드커버 책 더미, 눈꽃 무늬 라우파브뢰드와 훈제 양고기 항기쿄트",
    foods: [
      {
        name: "라우파브뢰드 (잎사귀 빵)",
        localName: "Laufabrauð",
        description:
          "종이처럼 얇게 민 원형 반죽 위에 온 가족이 모여 칼로 정교한 눈꽃·나뭇잎 무늬를 파낸 뒤 바삭하게 튀겨 먹는 전통 빵입니다.",
      },
      {
        name: "항기쿄트",
        localName: "Hangikjöt",
        description:
          "자작나무 연기 등으로 훈연한 짭조름한 양고기로, 크리미한 베샤멜 소스를 얹은 감자와 완두콩·절인 적양배추를 곁들입니다.",
      },
      {
        name: "욜라욀 & 크리스마스 쿠키",
        localName: "Jólaöl · Jólakökur",
        description:
          "달콤한 맥아 음료와 오렌지 탄산수(아펠신)를 각자 황금 비율로 섞어 마시는 무알코올 '욜라욀'과 생강·초콜릿 쿠키가 빠지지 않습니다.",
      },
    ],
    events: [
      {
        name: "욜라보카플로드 (책의 홍수)",
        dateHint: "11월 카탈로그 ~ 12월 24일 밤",
        description:
          "매년 11월 전 가정에 신간 도서 카탈로그가 배달되고, 이브 저녁 식사 후 선물 받은 책을 포근한 이불 속에서 읽으며 밤을 보냅니다.",
      },
      {
        name: "13명의 율 라즈 방문",
        dateHint: "12월 12일 ~ 24일",
        description:
          "'숟가락 핥기', '문 쾅 닫기' 같은 별명을 가진 13명의 트롤 형제가 매일 한 명씩 내려와 창틀에 놓인 신발 속에 선물을 남깁니다.",
      },
    ],
    funFact:
      "창틀에 둔 신발에 착한 아이는 작은 장난감이나 과자를 받지만, 말을 안 들은 아이는 율 라즈에게서 '썩은 감자 한 알'을 받는다는 귀여운 경고가 전해집니다.",
  },
  {
    id: "mexico",
    nameKo: "멕시코",
    nameEn: "Mexico",
    region: "아메리카",
    greeting: "¡Feliz Navidad!",
    seasonLabel: "건기 · 선선한 밤 축제",
    celebrationWindow: "12월 12일 ~ 1월 6일",
    headline: "9일간의 노래 행렬 라스 포사다스, 별 피냐타와 조각된 무",
    summary:
      "멕시코의 크리스마스는 거리 행진과 공동체 잔치의 연속입니다. 12월 16일부터 9일 밤 동안 마리아와 요셉의 여정을 재현하는 '라스 포사다스' 행렬 끝에 다채로운 피냐타를 깨뜨리고, 오아하카에서는 거대한 무를 예술 작품으로 깎습니다.",
    image: "/christmas/christmas-mexico.jpg",
    imageAlt: "별 피냐타가 걸린 멕시코 안뜰의 라스 포사다스 행렬과 타말레스, 부뉴엘로스, 폰체, 무 조각 일러스트",
    imageCaption: "7각 별 피냐타와 등불 아래 타말레스·부뉴엘로스, 따뜻한 폰체와 붉은 무 조각 인형",
    foods: [
      {
        name: "타말레스",
        localName: "Tamales",
        description:
          "옥수수 반죽(마사) 속에 고기·칠리 소스·치즈 등을 넣고 옥수수 껍질이나 바나나 잎에 싸서 찐 음식으로, 온 가족이 둘러앉아 함께 빚습니다.",
      },
      {
        name: "폰체 나비데뇨",
        localName: "Ponche Navideño",
        description:
          "구아바·사과·테호코테(산사나무 열매)·사탕수수·계피·히비스커스 꽃을 푹 끓여 토기 잔에 담아내는 향긋한 크리스마스 과일 펀치입니다.",
      },
      {
        name: "부뉴엘로스 & 포솔레",
        localName: "Buñuelos · Pozole",
        description:
          "바삭하게 튀겨 계피 설탕이나 사탕수수 시럽을 뿌린 부뉴엘로스와, 돼지고기·옥수수 알갱이가 든 따뜻한 국물 요리 포솔레를 나눕니다.",
      },
    ],
    events: [
      {
        name: "라스 포사다스 & 별 피냐타",
        dateHint: "12월 16일 ~ 24일",
        description:
          "촛불을 들고 집집마다 노래를 부르며 묵을 곳을 청한 뒤 문을 열면 잔치가 벌어지고, 일곱 가지 유혹을 뜻하는 7각 별 피냐타를 두드려 사탕을 쏟습니다.",
      },
      {
        name: "오아하카 라디시의 밤",
        dateHint: "12월 23일",
        description:
          "오아하카 시에서는 1897년부터 매년 12월 23일 거대하게 키운 붉은 무에 성탄 장면과 민속 풍경을 섬세하게 조각해 광장에 전시합니다.",
      },
    ],
    funFact:
      "멕시코가 원산지인 붉은 꽃 '포인세티아'는 현지어로 '크리스마스 이브의 꽃(Flor de Nochebuena)'이라 불리며, 전 세계 크리스마스 장식의 상징이 되었습니다.",
  },
  {
    id: "ethiopia",
    nameKo: "에티오피아",
    nameEn: "Ethiopia",
    region: "아프리카",
    greeting: "Melkam Genna!",
    seasonLabel: "건기 · 햇살 맑은 고원",
    celebrationWindow: "43일 금식 후 1월 7일 (간나)",
    headline: "1월 7일에 울려 퍼지는 촛불 찬송과 매콤한 도로 와트, 구르샤",
    summary:
      "에티오피아 정교회는 고대 율리우스력을 따르기 때문에 크리스마스 '간나(Ganna)'를 매년 1월 7일에 지냅니다. 43일 동안 육류와 유제품을 끊는 경건한 금식을 마친 뒤, 새벽 촛불 예배와 풍성한 공동 식사가 이어집니다.",
    image: "/christmas/christmas-ethiopia.jpg",
    imageAlt: "흰 전통 의상 샤마를 입고 촛불을 든 사람들과 바구니 위 도로 와트·인제라, 제베나 커피 일러스트",
    imageCaption: "1월 7일 새벽 흰 샤마와 밀랍 초, 바구니 메솝 위의 도로 와트·인제라와 제베나 커피",
    foods: [
      {
        name: "도로 와트 & 인제라",
        localName: "Doro Wat · Injera",
        description:
          "붉은 베르베레 향신료와 양파를 오래 볶아 낸 매콤한 닭 스튜 '도로 와트'와 삶은 달걀을, 테프 곡물로 만든 스펀지 같은 발효 빵 인제라에 얹어 뜯어 먹습니다.",
      },
      {
        name: "에티오피아 커피 세리머니",
        localName: "Buna",
        description:
          "생두를 팬에 직접 볶아 연기와 향을 두른 뒤 검은 토기 주전자 '제베나(Jebena)'에 끓여 세 차례에 걸쳐 정성껏 대접합니다.",
      },
      {
        name: "테지 (꿀 와인)",
        localName: "Tej",
        description:
          "명절 식탁에서는 야생 꽃꿀을 발효시킨 황금빛 전통 술 '테지'를 둥근 목이 긴 유리병에 담아 축하 건배를 올립니다.",
      },
    ],
    events: [
      {
        name: "간나 새벽 촛불 예배",
        dateHint: "1월 7일 새벽",
        description:
          "신도들이 눈부신 흰색 면직 의상 '샤마(Shamma)'를 맞춰 입고 암굴 성당(랄리벨라 등)에 모여 밀랍 초를 밝히고 밤새 찬송을 부릅니다.",
      },
      {
        name: "전통 하키 경기 & 구르샤",
        dateHint: "1월 7일 오후",
        description:
          "나무 막대와 공으로 치는 전통 경기 '예 간나 체와타'로 마을이 들썩이고, 식사 때는 손으로 음식을 떠 상대방 입에 넣어주는 '구르샤(Gursha)'로 존경과 사랑을 전합니다.",
      },
    ],
    funFact:
      "구르샤는 한 입을 떠서 서로의 입에 직접 먹여주는 에티오피아의 소중한 유대 의식으로, '한 그릇에서 같은 숨을 나누는 신뢰'를 상징합니다.",
  },
  {
    id: "philippines",
    nameKo: "필리핀",
    nameEn: "Philippines",
    region: "아시아",
    greeting: "Maligayang Pasko!",
    seasonLabel: "열대 겨울 · 가장 선선한 밤",
    celebrationWindow: "9월 'Ber Months' ~ 1월 초",
    headline: "9월부터 불을 밝히는 별 등불 파롤과 세계에서 가장 긴 축제",
    summary:
      "필리핀은 9월(September)부터 -ber로 끝나는 달이 시작되자마자 캐럴이 울려 퍼지는 '세계에서 가장 긴 크리스마스'의 나라입니다. 집집마다 별 등불을 걸고, 9일간 새벽 미사 후 따뜻한 쌀떡으로 아침을 엽니다.",
    image: "/christmas/christmas-philippines.jpg",
    imageAlt: "별 모양 파롤 등불이 걸린 필리핀 야간 거리와 통돼지 구이 레촌, 비빙카, 보랏빛 푸토 붐봉 일러스트",
    imageCaption: "형형색색의 별 등불 파롤 아래 자정 만찬 노체 부에나의 레촌·비빙카·푸토 붐봉",
    foods: [
      {
        name: "비빙카 & 푸토 붐봉",
        localName: "Bibingka · Puto Bumbong",
        description:
          "새벽 미사 후 성당 앞 노점에서 사 먹는 별미. 바나나 잎을 깐 흙냄비에 치즈·소금 절인 오리알을 올려 굽는 '비빙카'와 대나무 통에 찐 보랏빛 찹쌀떡 '푸토 붐봉'입니다.",
      },
      {
        name: "레촌",
        localName: "Lechon",
        description:
          "12월 24일 자정 이후 이어지는 만찬 '노체 부에나(Noche Buena)'의 주인공으로, 껍질이 유리처럼 바삭하게 구워진 통돼지 바비큐입니다.",
      },
      {
        name: "케소 데 볼라 & 판싯",
        localName: "Queso de Bola · Pancit",
        description:
          "빨간 왁스 껍질에 싸인 둥근 에담 치즈와, 장수와 행운을 기원하며 꼭 함께 올리는 볶음 국수 판싯·달콤한 필리핀식 스파게티가 차려집니다.",
      },
    ],
    events: [
      {
        name: "파롤 등불 & 거대 랜턴 축제",
        dateHint: "9월 ~ 1월 (산페르난도 축제 12월)",
        description:
          "대나무 뼈대와 반투명 종이·조명으로 만든 별 모양 등불 '파롤(Parol)'을 대문마다 걸어 베들레헴의 별을 기립니다.",
      },
      {
        name: "심방 가비 (9일 새벽 미사)",
        dateHint: "12월 16일 ~ 24일 새벽 4시",
        description:
          "크리스마스 전 아홉 날 동안 새벽닭 울음소리에 맞춰 성당에 모여 미사를 드리며, 9일을 모두 채우면 소원이 이루어진다고 전해집니다.",
      },
    ],
    funFact:
      "필리핀 팜팡가 주 산페르난도에서는 매년 12월 지름이 6미터에 달하고 수천 개의 전구가 음악에 맞춰 춤추는 '자이언트 랜턴 페스티벌'이 열립니다.",
  },
  {
    id: "australia",
    nameKo: "호주",
    nameEn: "Australia",
    region: "오세아니아",
    greeting: "Merry Christmas!",
    seasonLabel: "한여름 · 30℃ 푸른 바다",
    celebrationWindow: "12월 중순 ~ 26일 박싱데이",
    headline: "눈 대신 눈부신 백사장, 산타 모자를 쓴 서퍼와 차가운 새우 파티",
    summary:
      "남반구 호주의 크리스마스는 한여름 방학과 휴가철 한가운데 찾아옵니다. 뜨거운 오븐 앞 대신 바람 부는 뒷마당이나 본다이 비치에 모여 바비큐와 차가운 해산물, 생크림을 듬뿍 올린 과일 케이크를 즐깁니다.",
    image: "/christmas/christmas-australia.jpg",
    imageAlt: "산타 모자를 쓴 서퍼들이 걷는 호주 해변과 구운 타이거 새우, 망고·체리, 베리 파블로바 피크닉 일러스트",
    imageCaption: "산타 모자 서퍼들이 보이는 여름 해변 피크닉 매트 위 타이거 새우·망고·베리 파블로바",
    foods: [
      {
        name: "칠링한 타이거 새우 & 시푸드",
        localName: "Aussie Christmas Prawns",
        description:
          "시드니 수산시장에서 크리스마스 전날 밤을 새워 줄 서서 사 오는 신선한 왕새우와 굴을 얼음 위에 올려 레몬즙과 곁들입니다.",
      },
      {
        name: "파블로바",
        localName: "Pavlova",
        description:
          "겉은 바삭하고 속은 마시멜로처럼 폭신한 머랭 케이크 위에 휘핑크림과 딸기·키위·패션프루트·망고 등 여름 과일을 산처럼 올린 대표 디저트입니다.",
      },
      {
        name: "해변 바비큐 & 체리",
        localName: "Christmas Barbie",
        description:
          "야외 그릴에서 굽는 글레이즈드 햄과 소시지, 그리고 호주의 여름 크리스마스를 알리는 붉고 달콤한 제철 체리가 빠지지 않습니다.",
      },
    ],
    events: [
      {
        name: "본다이 비치 서핑 & 백야드 크리켓",
        dateHint: "12월 25일",
        description:
          "수영복 차림에 빨간 산타 모자를 쓰고 파도를 타거나, 식사 후 온 가족이 잔디밭에 모여 전통적으로 크리켓 경기를 벌입니다.",
      },
      {
        name: "캐롤 바이 캔들라이트",
        dateHint: "12월 밤 야외 공원",
        description:
          "선선한 여름밤 멜버른·시드니 대형 공원에 돗자리를 펴고 수만 명이 전자 촛불을 흔들며 야외 오케스트라와 함께 캐롤을 합창합니다.",
      },
    ],
    funFact:
      "호주 아이들은 순록이 더운 날씨에 목마를 것을 걱정해 산타에게 쿠키 대신 차가운 맥주 한 병을, 루돌프에게는 당근을 남겨두기도 합니다.",
  },
  {
    id: "korea",
    nameKo: "대한민국",
    nameEn: "South Korea",
    region: "아시아",
    greeting: "메리 크리스마스!",
    seasonLabel: "겨울 · 눈과 도심 일루미네이션",
    celebrationWindow: "12월 초 ~ 12월 25일",
    headline: "화려한 미디어 파사드 거리와 연말 데이트, 그리고 딸기 생크림 케이크",
    summary:
      "한국의 크리스마스는 유일한 동아시아 공휴일인 만큼 연인·친구·가족이 함께 도심의 대형 트리와 백화점 외벽 미디어 파사드를 구경하고, 따뜻한 카페나 식당에서 케이크를 나누는 로맨틱한 겨울 축제에 가깝습니다.",
    image: "/christmas/christmas-korea.jpg",
    imageAlt: "눈 내리는 서울 남산타워 야경이 보이는 창가 나무 테이블 위 딸기 생크림 케이크와 라떼 일러스트",
    imageCaption: "눈 내리는 서울 겨울밤 카페 창가, 흰 생크림에 빨간 딸기를 올린 홀케이크와 따뜻한 라떼",
    foods: [
      {
        name: "생크림 딸기 홀케이크",
        localName: "Christmas Cake",
        description:
          "겨울 딸기가 제철을 맞는 한국에서는 하얀 생크림 위에 선명한 빨간 딸기가 올라간 케이크가 한 달 전부터 예약 대란이 일 만큼 핵심 상징입니다.",
      },
      {
        name: "연말 외식 · 겨울 제철 먹거리",
        localName: "파티 테이블 & 겨울 별미",
        description:
          "특정 전통 요리 대신 파스타·스테이크 코스부터 방어회·삼겹살·치킨·붕어빵까지 각자 가장 좋아하는 음식을 홈파티나 맛집에서 즐깁니다.",
      },
      {
        name: "시즌 한정 라떼 · 뱅쇼",
        localName: "겨울 카페 음료",
        description:
          "전국 카페들이 토피넛 라떼, 페퍼민트 모카, 따뜻한 무알코올 뱅쇼를 선보이며 골목마다 연말 분위기를 더합니다.",
      },
    ],
    events: [
      {
        name: "도심 빛 축제 & 백화점 미디어 파사드",
        dateHint: "11월 중순 ~ 12월 말",
        description:
          "명동·을지로·잠실·더현대 등 주요 광장과 백화점 외벽에 거대한 크리스마스 마을과 미디어 아트가 펼쳐져 '인증샷 명소'로 붐빕니다.",
      },
      {
        name: "유럽식 크리스마스 마켓 & 성탄 예배",
        dateHint: "12월 중순 ~ 25일",
        description:
          "광화문·잠실 야외 마켓에서 회전목마와 수공예 소품을 즐기고, 전국 성당과 교회에서는 이브 자정 미사 및 성탄 축하 예배가 열립니다.",
      },
    ],
    funFact:
      "한국에서 12월 25일은 일요일 외에 종교 기념일(석가탄신일과 함께)로서 법정 공휴일로 지정되어 있어, 비기독교인도 연말 휴식과 데이트의 날로 폭넓게 즐깁니다.",
  },
  {
    id: "japan",
    nameKo: "일본",
    nameEn: "Japan",
    region: "아시아",
    greeting: "メリークリスマス!",
    seasonLabel: "겨울 · 도시 일루미네이션",
    celebrationWindow: "11월 말 ~ 12월 25일",
    headline: "예약 줄 서는 크리스마스 프라이드 치킨 버킷과 이치고 쇼트케이크",
    summary:
      "일본의 크리스마스는 로맨틱한 겨울 일루미네이션과 독창적인 현대 식문화가 결합된 날입니다. 1970년대 광고에서 출발한 프라이드 치킨 버킷과 흰 눈·산타를 연상시키는 딸기 쇼트케이크가 국민 공식처럼 자리 잡았습니다.",
    image: "/christmas/christmas-japan.jpg",
    imageAlt: "도쿄 일루미네이션 거리가 보이는 창가 테이블의 프라이드 치킨 버킷과 일본 딸기 쇼트케이크 일러스트",
    imageCaption: "빛으로 물든 도쿄 겨울 거리 앞 바삭한 크리스마스 치킨 버킷과 이치고 쇼트케이크",
    foods: [
      {
        name: "크리스마스 프라이드 치킨",
        localName: "クリスマスチキン (KFC)",
        description:
          "1974년 '크리스마스엔 켄터키!' 캠페인이 대성공을 거둔 뒤, 오늘날에도 수 주 전부터 파티 버킷을 사전 예약해 저녁 식탁에 올립니다.",
      },
      {
        name: "이치고 쇼트케이크",
        localName: "苺のショートケーキ",
        description:
          "폭신한 스펀지시트 사이에 가벼운 생크림과 슬라이스 딸기를 채운 케이크. 흰 크림과 붉은 딸기가 일본 축하 문화의 홍백(紅白)과 맞닿아 있습니다.",
      },
      {
        name: "피자 & 샴메리",
        localName: "シャンメリー",
        description:
          "아이들과 함께 샴페인처럼 '뻥' 소리를 내며 따는 무알코올 탄산음료 샴메리가 파티 테이블의 단골입니다.",
      },
    ],
    events: [
      {
        name: "겨울 일루미네이션",
        dateHint: "11월 ~ 12월 25일 (일부 2월까지)",
        description:
          "도쿄 롯폰기 케야키자카, 마루노우치, 삿포로 오도리 공원 등이 수백만 개의 LED 전구로 빛나며 연인들의 대표 산책 코스가 됩니다.",
      },
      {
        name: "크리스마스 이브 데이트 & 케이크 할인전",
        dateHint: "12월 24~25일",
        description:
          "일본에서는 24일 이브가 연인들의 밤에 가까워 레스토랑 예약이 몇 달 전에 마감되며, 25일 저녁이 지나면 케이크가 빠르게 새해(오쇼가쓰) 장식으로 바뀝니다.",
      },
    ],
    funFact:
      "25일이 지나자마자 일본의 백화점과 상점들은 놀라운 속도로 크리스마스 트리를 치우고 하룻밤 만에 소나무·대나무 문 장식인 '카도마쓰'를 세워 새해맞이로 전환합니다.",
  },
];

export const CHRISTMAS_TIMELINE: TimelineMilestone[] = [
  {
    date: "9월 1일 ~",
    country: "필리핀",
    title: "세계에서 가장 긴 크리스마스 시작",
    detail: "영어 달 이름 끝이 -ber로 끝나는 9월부터 쇼핑몰과 거리에 캐럴과 별 등불 파롤이 켜집니다.",
  },
  {
    date: "11월 말 ~",
    country: "독일 · 한국 · 일본",
    title: "광장 마켓 & 겨울 일루미네이션 점등",
    detail: "독일은 바이나흐츠마르크트, 한국과 일본은 도심 빛 축제와 크리스마스 케이크 예약이 시작됩니다.",
  },
  {
    date: "12월 12일 ~ 24일",
    country: "아이슬란드",
    title: "13명의 율 라즈 매일 한 명씩 방문",
    detail: "12일부터 크리스마스 이브까지 매일 밤 다른 개성의 트롤 형제가 창틀 신발에 선물을 놓습니다.",
  },
  {
    date: "12월 16일 ~ 24일",
    country: "멕시코 · 필리핀",
    title: "9일 밤 포사다스 & 9일 새벽 심방 가비",
    detail: "멕시코는 저녁 행렬과 피냐타, 필리핀은 새벽 4시 미사와 바나나잎 비빙카로 9일을 채웁니다.",
  },
  {
    date: "12월 22일 ~ 23일",
    country: "스페인 · 멕시코(오아하카)",
    title: "엘 고르도 복권 추첨 & 라디시의 밤",
    detail: "스페인 온 국민이 복권 노래 중계를 보고, 오아하카 광장은 거대한 붉은 무 조각 전시장이 됩니다.",
  },
  {
    date: "12월 24일 이브 밤",
    country: "폴란드 · 프랑스 · 이탈리아 · 아이슬란드",
    title: "첫 별, 레베용, 라 비질리아, 책의 홍수",
    detail: "첫 별을 보고 12가지 음식(폴란드), 해산물과 샴페인(프랑스·이탈리아), 새 책 읽기(아이슬란드)가 펼쳐집니다.",
  },
  {
    date: "12월 25일",
    country: "호주 · 전 세계",
    title: "한여름 바다 서핑과 파블로바 피크닉",
    detail: "북반구가 눈 속에서 선물을 열 때, 남반구 호주는 30℃ 해변에서 산타 모자를 쓰고 새우와 파블로바를 나눕니다.",
  },
  {
    date: "1월 6일 ~ 7일",
    country: "스페인 · 이탈리아 · 에티오피아",
    title: "동방박사 · 마녀 베파나 · 에티오피아 간나",
    detail: "1월 6일 스페인과 이탈리아 아이들이 진짜 선물을 받고, 1월 7일 에티오피아는 43일 금식 끝 새벽 촛불 축제를 엽니다.",
  },
];
