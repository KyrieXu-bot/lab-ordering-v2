INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('金属室温拉伸（T）','金属抗拉强度/断后伸长率',100.00,3,'LMT01','/','mechanics'),
	 ('金属室温拉伸（T）','抗拉/屈服/模量/延伸率/断面收缩率-引伸计',200.00,3,'LMT02','/','mechanics'),
	 ('金属室温拉伸（T）','抗拉/屈服/模量/延伸率/泊松比-引伸计',300.00,3,'LMT03','/','mechanics'),
	 ('金属室温拉伸（T）','抗拉/屈服/模量/延伸率/n值-引伸计',300.00,3,'LMT04','/','mechanics'),
	 ('金属室温拉伸（T）','抗拉/屈服/模量/延伸率/泊松比/n值/r值-引伸计',500.00,3,'LMT05','/','mechanics'),
	 ('金属室温拉伸（T）','抗拉/屈服/模量/延伸率/泊松比/n值/r值-DIC',800.00,3,'LMT06','/','mechanics'),
	 ('金属室温拉伸（T）','非标小样品(总长＜50mm)-视频引伸计',300.00,3,'LMT07','/','mechanics'),
	 ('金属室温拉伸（T）','金属板材-抗拉/屈服/模量/延伸率/泊松比-2D-DIC',500.00,3,'LMT08','/','mechanics'),
	 ('金属室温拉伸（T）','金属棒材-抗拉/屈服/模量/延伸率/泊松比-3D-DIC',600.00,3,'LMT09','/','mechanics'),
	 ('循环试验','金属拉伸加卸载-引伸计',100.00,3,'LMT41','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('循环试验','金属拉伸加卸载-DIC',300.00,3,'LMT42','/','mechanics'),
	 ('循环试验','金属拉伸-压缩-拉伸循环试验(MTCT)＜5%',400.00,3,'LMT43','/','mechanics'),
	 ('循环试验','金属拉伸-压缩-拉伸循环试验(MTCT)≥5%',700.00,3,'LMT44','/','mechanics'),
	 ('金属高低温拉伸','金属拉伸强度/模量/延伸率(-60℃~-41℃)',800.00,3,'LMT11','/','mechanics'),
	 ('金属高低温拉伸','金属拉伸强度/模量/延伸率(-40℃~10℃)',500.00,3,'LMT12','/','mechanics'),
	 ('金属高低温拉伸','强度/模量/延伸率(50℃~150℃)',300.00,3,'LMT21','/','mechanics'),
	 ('金属高低温拉伸','强度/模量/延伸率(151℃~300℃)',400.00,3,'LMT22','/','mechanics'),
	 ('金属高低温拉伸','强度/模量/延伸率(301℃~600℃)',500.00,3,'LMT23','/','mechanics'),
	 ('金属高低温拉伸','强度/模量/延伸率(601℃~900℃)',800.00,3,'LMT24','/','mechanics'),
	 ('金属高低温拉伸','强度/模量/延伸率(901℃~1050℃)',1200.00,3,'LMT25','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('-','-',0.00,NULL,'','/',NULL),
	 ('金属三点弯曲','金属弯曲强度/模量(室温)',200.00,3,'LMF01','/','mechanics'),
	 ('金属三点弯曲','金属弯折弯角度(室温)',300.00,3,'LMF03','/','mechanics'),
	 ('金属剪切','销剪切强度(室温)',300.00,3,'LMS02','/','mechanics'),
	 ('-','-',0.00,NULL,'','/',NULL),
	 ('金属剪切','销剪切强度(50℃~150℃)',400.00,3,'LMS31','/','mechanics'),
	 ('金属剪切','销剪切强度(151℃~350℃)',500.00,3,'LMS32','/','mechanics'),
	 ('金属焊接强度','金属板材焊接强度(室温)',200.00,3,'LMT51','/','mechanics'),
	 ('金属焊接强度','棒材焊接强度(室温)-带夹具',300.00,3,'LMT52','/','mechanics'),
	 ('金属持久','金属持久(室温)',8.00,3,'LRR01','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('金属持久','金属持久(251℃~600℃)',10.00,3,'LRR21','/','mechanics'),
	 ('金属持久','金属持久(601℃~900℃)',12.00,3,'LRR22','/','mechanics'),
	 ('金属持久','金属持久(901℃~1000℃)',14.00,3,'LRR23','/','mechanics'),
	 ('金属持久','金属持久(-30℃~10℃)',30.00,3,'LRR11','/','mechanics'),
	 ('金属持久','金属持久(50℃~250℃)',30.00,3,'LRR12','/','mechanics'),
	 ('金属蠕变','金属蠕变(室温)',10.00,3,'LRC01','/','mechanics'),
	 ('金属蠕变','金属蠕变(251℃~600℃)',12.00,3,'LRC21','/','mechanics'),
	 ('金属蠕变','金属蠕变(601℃~900℃)',14.00,3,'LRC22','/','mechanics'),
	 ('金属蠕变','金属蠕变(901℃~1000℃)',16.00,3,'LRC23','/','mechanics'),
	 ('金属蠕变','金属蠕变(-30℃~10℃)',30.00,3,'LRC11','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('金属蠕变','金属蠕变(50℃~250℃)',30.00,3,'LRC12','/','mechanics'),
	 ('应力控制疲劳SCF（L）','应力控制疲劳(室温)',100.00,3,'LFL01','/','mechanics'),
	 ('应力控制疲劳SCF（L）','应力控制疲劳(-30℃~10℃)',350.00,3,'LFL02','/','mechanics'),
	 ('应力控制疲劳SCF（L）','应力控制疲劳(50℃~300℃)',150.00,3,'LFL03','/','mechanics'),
	 ('应力控制疲劳SCF（L）','应力控制疲劳(301℃~600℃)',200.00,3,'LFL04','/','mechanics'),
	 ('应力控制疲劳SCF（L）','应力控制疲劳(601℃~900℃)',250.00,3,'LFL05','/','mechanics'),
	 ('应力控制疲劳SCF（L）','SN曲线（室温，1000万次，5个应力水平，50Hz，重复3件）',30000.00,3,'LFL07','/','mechanics'),
	 ('应变控制疲劳LCF（S）','应变控制疲劳(室温)',120.00,3,'LFS01','/','mechanics'),
	 ('应变控制疲劳LCF（S）','应变控制疲劳(-30℃~10℃)',400.00,3,'LFS02','/','mechanics'),
	 ('应变控制疲劳LCF（S）','应变控制疲劳(50℃~300℃)',200.00,3,'LFS03','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('应变控制疲劳LCF（S）','应变控制疲劳(301℃~600℃)',250.00,3,'LFS04','/','mechanics'),
	 ('应变控制疲劳LCF（S）','应变控制疲劳(601℃~900℃)',300.00,3,'LFS05','/','mechanics'),
	 ('应变控制疲劳LCF（S）','EN曲线（室温，100万次，5个应力水平，每级重复3件，当次数超过10w次转换为应力控制',36000.00,3,'LFS07','/','mechanics'),
	 ('热机械疲劳（T）','热机械疲劳(300℃~600℃)',450.00,3,'LFT01','/','mechanics'),
	 ('热机械疲劳（T）','热机械疲劳(601℃~900℃)',550.00,3,'LFT02','/','mechanics'),
	 ('热机械疲劳（T）','热机械疲劳(901℃~1200℃)',650.00,3,'LFT03','/','mechanics'),
	 ('超声疲劳（U）','400元/样起，室温',200.00,3,'LFU01','/','mechanics'),
	 ('金属断裂韧性K1C（F）','金属KIC(室温)',800.00,3,'LFF01','/','mechanics'),
	 ('金属断裂韧性K1C（F）','金属KIC(-30℃~10℃)',2800.00,3,'LFF02','/','mechanics'),
	 ('金属断裂韧性K1C（F）','金属KIC(50℃~300℃)',1200.00,3,'LFF03','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('金属断裂韧性K1C（F）','金属KIC(301℃~600℃)',1600.00,3,'LFF04','/','mechanics'),
	 ('金属断裂韧性K1C（F）','金属KIC(601℃~900℃)',2000.00,3,'LFF05','/','mechanics'),
	 ('金属断裂韧性J1C（F）','金属JIC(室温)',800.00,3,'LFF07','/','mechanics'),
	 ('裂纹扩展速率（F）','金属裂纹扩展速率(室温)',1500.00,3,'LFF11','/','mechanics'),
	 ('裂纹扩展速率（F）','金属裂纹扩展速率(-30℃~10℃)',5000.00,3,'LFF12','/','mechanics'),
	 ('裂纹扩展速率（F）','金属裂纹扩展速率(50℃~300℃)',2000.00,3,'LFF13','/','mechanics'),
	 ('裂纹扩展速率（F）','金属裂纹扩展速率(301℃~600℃)',3000.00,3,'LFF14','/','mechanics'),
	 ('裂纹扩展速率（F）','金属裂纹扩展速率(601℃~900℃)',4000.00,3,'LFF15','/','mechanics'),
	 ('高速拉伸（T）','高速拉伸(室温)',1000.00,3,'LDT01','/','mechanics'),
	 ('高速拉伸（T）','高速拉伸(-40℃~10℃)',2000.00,3,'LDT02','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('高速拉伸（T）','高速拉伸(50℃~150℃)',1500.00,3,'LDT03','/','mechanics'),
	 ('高速拉伸（T）','高速拉伸(151℃~250℃)',1800.00,3,'LDT04','/','mechanics'),
	 ('高速压缩（C）','高速压缩(室温)',1000.00,3,'LDC01','/','mechanics'),
	 ('高速压缩（C）','高速压缩(-40℃~10℃)',2000.00,3,'LDC02','/','mechanics'),
	 ('高速压缩（C）','高速压缩(50℃~150℃)',1500.00,3,'LDC03','/','mechanics'),
	 ('高速压缩（C）','高速压缩(151℃~250℃)',1800.00,3,'LDC04','/','mechanics'),
	 ('落锤冲击（D）','落锤穿孔(室温)',200.00,3,'LDD01','/','mechanics'),
	 ('落锤冲击（D）','落锤穿孔(-60℃~-40℃)',450.00,3,'LDD04','/','mechanics'),
	 ('落锤冲击（D）','落锤穿孔(-40℃~10℃)',350.00,3,'LDD07','/','mechanics'),
	 ('落锤冲击（D）','落锤穿孔(50℃~150℃)',300.00,3,'LDD10','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('落锤冲击（D）','非标零件冲击',0.00,3,'LDD13','/','mechanics'),
	 ('塑料拉伸（T）','硬质塑料强度/模量/断裂伸长率(室温)',500.00,3,'LST01','/','mechanics'),
	 ('塑料拉伸（T）','硬质塑料强度/模量/泊松比(室温)',250.00,3,'LST02','/','mechanics'),
	 ('塑料拉伸（T）','硬质塑料-2D-DIC(室温)',500.00,3,'LST03','/','mechanics'),
	 ('塑料拉伸（T）','薄膜拉伸强度/模量-引伸计(室温)',300.00,3,'LST06','/','mechanics'),
	 ('塑料压缩（C）','塑料压缩强度(室温)',220.00,3,'LSC01','/','mechanics'),
	 ('塑料压缩（C）','塑料压缩强度/模量(室温)',70.00,3,'LSC02','/','mechanics'),
	 ('塑料压缩（C）','塑料压缩率、回弹率(室温)',20.00,3,'LSC03','/','mechanics'),
	 ('塑料弯曲（F）','塑料弯曲强度、模量(室温)',140.00,3,'LSF01','/','mechanics'),
	 ('塑料剪切（S）','塑料剪切强度(室温)',150.00,3,'LSS01','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('高分子蠕变(S)','高分子蠕变(室温)',20.00,3,'LRS01','/','mechanics'),
	 ('高分子蠕变(S)','高分子蠕变(-40℃~-20℃)',40.00,3,'LRS02','/','mechanics'),
	 ('高分子蠕变(S)','高分子蠕变(-20℃~10℃)',30.00,3,'LRS03','/','mechanics'),
	 ('高分子蠕变(S)','高分子蠕变(50℃~150℃)',30.00,3,'LRS04','/','mechanics'),
	 ('高分子蠕变(S)','高分子蠕变(151℃~250℃)',40.00,3,'LRS05','/','mechanics'),
	 ('塑料拉伸（T）','陶瓷拉伸强度/模量(室温)',300.00,3,'LST41','/','mechanics'),
	 ('塑料拉伸（T）','陶瓷拉伸强度/模量/泊松比(室温)',400.00,3,'LST42','/','mechanics'),
	 ('陶瓷材料压缩','陶瓷压缩强度/模量(室温)',300.00,3,'LSC41','/','mechanics'),
	 ('陶瓷材料压缩','陶瓷压缩强度/模量/泊松比(室温)',400.00,3,'LSC42','/','mechanics'),
	 ('陶瓷材料弯曲（F）','陶瓷弯曲强度/模量(室温)',200.00,3,'LSF41','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('陶瓷材料断裂韧性（F）','陶瓷断裂韧性单边V型缺口梁法(室温)',800.00,3,'LSF51','/','mechanics'),
	 ('复材拉伸（T）','复材拉伸强度(室温)',100.00,3,'LPT01','/','mechanics'),
	 ('复材拉伸（T）','复材拉伸强度/模量(室温)',150.00,3,'LPT02','/','mechanics'),
	 ('复材拉伸（T）','复材拉伸强度/模量(-60℃~-41℃)',450.00,3,'LPT11','/','mechanics'),
	 ('复材拉伸（T）','复材拉伸强度/模量(-40℃~10℃)',400.00,3,'LPT12','/','mechanics'),
	 ('复材拉伸（T）','复材拉伸强度/模量(50℃~100℃)',250.00,3,'LPT21','/','mechanics'),
	 ('复材拉伸（T）','复材拉伸强度/模量(101℃~250℃)',350.00,3,'LPT22','/','mechanics'),
	 ('复材拉伸（T）','复材拉伸强度/模量(251℃~350℃)',450.00,3,'LPT23','/','mechanics'),
	 ('复材拉伸（T）','复材拉伸强度/模量/泊松比(-60℃~-41℃)',550.00,3,'LPT13','/','mechanics'),
	 ('复材拉伸（T）','复材拉伸强度/模量/泊松比(-40℃~10℃)',500.00,3,'LPT14','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('复材压缩（C）','复材压缩强度(室温)',150.00,3,'LPC01','/','mechanics'),
	 ('复材压缩（C）','复材压缩强度/模量(室温)',220.00,3,'LPC02','/','mechanics'),
	 ('复材压缩（C）','复材压缩强度/模量(-60℃~-41℃)',550.00,3,'LPC11','/','mechanics'),
	 ('复材压缩（C）','复材压缩强度/模量(-40℃~10℃)',500.00,3,'LPC12','/','mechanics'),
	 ('复材压缩（C）','复材压缩强度/模量(50℃~120℃)',300.00,3,'LPC21','/','mechanics'),
	 ('复材压缩（C）','复材压缩强度(121℃~250℃)',400.00,3,'LPC23','/','mechanics'),
	 ('复材压缩（C）','复材压缩强度(251℃~350℃)',700.00,3,'LPC26','/','mechanics'),
	 ('复材压缩（C）','复材压缩-2D-DIC(251℃~350℃)',800.00,3,'LPC27','/','mechanics'),
	 ('复材三点弯曲（F）','复材三点弯曲强度/模量(室温)',140.00,3,'LPF01','/','mechanics'),
	 ('复材三点弯曲（F）','复材三点弯曲强度/模量(-60℃~-41℃)',360.00,3,'LPF11','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('复材三点弯曲（F）','复材三点弯曲强度/模量(-40℃~10℃)',310.00,3,'LPF12','/','mechanics'),
	 ('复材三点弯曲（F）','复材三点弯曲强度/模量(50℃~100℃)',200.00,3,'LPF21','/','mechanics'),
	 ('复材三点弯曲（F）','复材三点弯曲强度/模量(101℃~250℃)',250.00,3,'LPF22','/','mechanics'),
	 ('复材三点弯曲（F）','复材三点弯曲强度/模量(251℃~350℃)',380.00,3,'LPF23','/','mechanics'),
	 ('复材三点弯曲（F）','复材三点弯曲-2D-DIC(室温)',500.00,3,'LPF02','/','mechanics'),
	 ('面内剪切（S）','面内剪切强度/模量(室温)',250.00,3,'LPS01','/','mechanics'),
	 ('面内剪切（S）','面内剪切强度/模量(-60℃~-41℃)',600.00,3,'LPS11','/','mechanics'),
	 ('面内剪切（S）','面内剪切强度/模量(-40℃~10℃)',550.00,3,'LPS12','/','mechanics'),
	 ('面内剪切（S）','面内剪切强度/模量(50℃~100℃)',350.00,3,'LPS21','/','mechanics'),
	 ('面内剪切（S）','面内剪切强度/模量(101℃~250℃)',450.00,3,'LPS22','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('面内剪切（S）','面内剪切强度/模量(251℃~350℃)',550.00,3,'LPS23','/','mechanics'),
	 ('面内剪切（S）','面内剪切-2D-DIC(室温)',550.00,3,'LPS02','/','mechanics'),
	 ('V型剪切（S）','V形剪切强度/模量(室温)',300.00,3,'LPS31','/','mechanics'),
	 ('V型剪切（S）','V形剪切强度/模量(-60℃~-41℃)',650.00,3,'LPS41','/','mechanics'),
	 ('V型剪切（S）','V形剪切强度/模量(-40℃~10℃)',600.00,3,'LPS42','/','mechanics'),
	 ('V型剪切（S）','V形剪切强度/模量(50℃~120℃)',400.00,3,'LPS51','/','mechanics'),
	 ('V型剪切（S）','V形剪切''强度/模量-2D-DIC(121℃~250℃)',800.00,3,'LPS54','/','mechanics'),
	 ('V型剪切（S）','V形剪切强度/模量-2D-DIC(251℃~350℃)',900.00,3,'LPS56','/','mechanics'),
	 ('V型剪切（S）','V形剪切强度/模量-2D-DIC(室温)',600.00,3,'LPS32','/','mechanics'),
	 ('短梁/层间剪切（S）','层间剪切强度(室温)',110.00,3,'LPS61','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('短梁/层间剪切（S）','层间剪切强度(-60℃~-41℃)',360.00,3,'LPS71','/','mechanics'),
	 ('短梁/层间剪切（S）','层间剪切强度(-40℃~10℃)',310.00,3,'LPS72','/','mechanics'),
	 ('短梁/层间剪切（S）','层间剪切强度(50℃~100℃)',200.00,3,'LPS81','/','mechanics'),
	 ('短梁/层间剪切（S）','层间剪切强度(101℃~250℃)',250.00,3,'LPS82','/','mechanics'),
	 ('短梁/层间剪切（S）','层间剪切强度(251℃~350℃)',380.00,3,'LPS83','/','mechanics'),
	 ('双梁剪切（F）','双梁剪切强度(室温)',350.00,3,'LPF06','/','mechanics'),
	 ('开孔拉伸/填孔拉伸（T）','开孔/填孔拉伸强度/模量(室温)',150.00,3,'LPT06','/','mechanics'),
	 ('开孔拉伸/填孔拉伸（T）','开孔/填孔拉伸强度/模量(-60℃~-41℃)',450.00,3,'LPT15','/','mechanics'),
	 ('开孔拉伸/填孔拉伸（T）','开孔/填孔拉伸强度/模量(-40℃~10℃)',400.00,3,'LPT16','/','mechanics'),
	 ('开孔拉伸/填孔拉伸（T）','开孔/填孔拉伸强度/模量(50℃~100℃)',250.00,3,'LPT27','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('开孔拉伸/填孔拉伸（T）','开孔/填孔拉伸强度/模量(101℃~250℃)',350.00,3,'LPT28','/','mechanics'),
	 ('开孔拉伸/填孔拉伸（T）','开孔/填孔拉伸强度/模量(251℃~350℃)',450.00,3,'LPT29','/','mechanics'),
	 ('开孔压缩/填孔压缩（C）','开孔/填孔压缩强度(室温)',240.00,3,'LPC31','/','mechanics'),
	 ('开孔压缩/填孔压缩（C）','开孔/填孔压缩强度/模量(-60℃~-41℃)',550.00,3,'LPC41','/','mechanics'),
	 ('开孔压缩/填孔压缩（C）','开孔/填孔压缩强度/模量(-40℃~10℃)',500.00,3,'LPC42','/','mechanics'),
	 ('开孔压缩/填孔压缩（C）','开孔/填孔压缩强度(50℃~100℃)',380.00,3,'LPC51','/','mechanics'),
	 ('开孔压缩/填孔压缩（C）','开孔/填孔压缩强度(101℃~250℃)',450.00,3,'LPC52','/','mechanics'),
	 ('开孔压缩/填孔压缩（C）','开孔/填孔压缩强度(251℃~350℃)',550.00,3,'LPC53','/','mechanics'),
	 ('螺栓挤压（T）','挤压强度/偏移(室温)',200.00,3,'LPT31','/','mechanics'),
	 ('螺栓挤压（T）','挤压强度/偏移(-60℃~-41℃)',550.00,3,'LPT41','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('螺栓挤压（T）','挤压强度/偏移(-40℃~10℃)',500.00,3,'LPT42','/','mechanics'),
	 ('螺栓挤压（T）','挤压强度/偏移(50℃~100℃)',300.00,3,'LPT51','/','mechanics'),
	 ('螺栓挤压（T）','挤压强度/偏移(101℃~250℃)',450.00,3,'LPT52','/','mechanics'),
	 ('螺栓挤压（T）','挤压强度/偏移(271℃~350℃)',550.00,3,'LPT53','/','mechanics'),
	 ('冲击后压缩（A）','CAI-冲击(室温)',200.00,3,'LPA01','/','mechanics'),
	 ('冲击后压缩（A）','无损检测',200.00,3,'LPA02','/','mechanics'),
	 ('冲击后压缩（A）','CAI仅压缩，不贴片(室温)',300.00,3,'LPA03','/','mechanics'),
	 ('冲击后压缩（A）','冲击+无损+压缩贴片',900.00,3,'LPA04','/','mechanics'),
	 ('冲击后压缩（A）','CAI-2D-DIC(室温)',1100.00,3,'LPA05','/','mechanics'),
	 ('单搭接/双搭接（T）','单搭接强度(室温)',200.00,3,'LPT61','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('单搭接/双搭接（T）','单搭接强度(-60℃~-41℃)',450.00,3,'LPT71','/','mechanics'),
	 ('单搭接/双搭接（T）','单搭接强度(-40℃~10℃)',400.00,3,'LPT72','/','mechanics'),
	 ('单搭接/双搭接（T）','单搭接强度(50℃~100℃)',250.00,3,'LPT81','/','mechanics'),
	 ('单搭接/双搭接（T）','单搭接强度(101℃~250℃)',350.00,3,'LPT82','/','mechanics'),
	 ('单搭接/双搭接（T）','单搭接强度(251℃~350℃)',450.00,3,'LPT83','/','mechanics'),
	 ('平面拉伸（T）','平面拉伸强度-室温(含面板粘贴)',350.00,3,'LPT91','/','mechanics'),
	 ('剥离强度（P）','滚筒剥离强度(室温)',250.00,3,'LPP01','/','mechanics'),
	 ('夹层结构压缩（C）','夹层结构侧压强度(室温)',200.00,3,'LPC61','/','mechanics'),
	 ('夹层结构压缩（C）','夹层结构平压强度(室温)',200.00,3,'LPC62','/','mechanics'),
	 ('夹层芯材拉伸剪切（T）','夹层芯材拉伸剪切强度-室温(含面板粘贴)',300.00,3,'LPT93','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('夹层结构弯曲(F)','夹层结构芯子剪切极限强度',300.00,3,'LPF41','/','mechanics'),
	 ('夹层结构弯曲(F)','夹层结构芯子剪切极限强度/偏移强度',400.00,3,'LPF42','/','mechanics'),
	 ('夹层结构弯曲(F)','面板应力/面板弹性模量/夹层结构弯曲刚度',400.00,3,'LPF43','/','mechanics'),
	 ('夹层结构弯曲(F)','夹层结构弯曲刚度/夹层结构横向剪切刚度/芯子剪切模量',800.00,3,'LPF44','/','mechanics'),
	 ('层间断裂韧性（F）','复材GⅠC(室温)',800.00,3,'LPF31','/','mechanics'),
	 ('层间断裂韧性（F）','复材GⅡC  HB(室温)',500.00,3,'LPF32','/','mechanics'),
	 ('层间断裂韧性（F）','复材GⅡC  ASTM(室温)',800.00,3,'LPF33','/','mechanics'),
	 ('混合型断裂韧性（F）','复材GⅠC+ⅡC(室温)',800.00,3,'LPF35','/','mechanics'),
	 ('NOL环拉伸（T）','NOL环拉伸强度(室温)',250.00,3,'LPT36','/','mechanics'),
	 ('NOL环拉伸（T）','NOL环拉伸强度/模量(室温)',350.00,3,'LPT37','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('状态调节(A)','状态调节-水浴锅',8.00,3,'LRA01','/','mechanics'),
	 ('状态调节(A)','状态调节-马弗炉/烘箱',12.00,3,'LRA02','/','mechanics'),
	 ('状态调节(A)','状态调节-吸湿箱(11℃~98℃)',20.00,3,'LRA03','/','mechanics'),
	 ('状态调节(A)','状态调节-吸湿箱(99℃~150℃)',30.00,3,'LRA04','/','mechanics'),
	 ('抗氧化性(D)','抗氧化性-氧化速率/氧化增重-重量增加法(3样/组)',12.00,3,'LRD06','/','mechanics'),
	 ('布洛维硬度（H）','维氏硬度，3个点起测',180.00,3,'LHH01','/','mechanics'),
	 ('布洛维硬度（H）','布氏硬度，3个点起测',180.00,3,'LHH02','/','mechanics'),
	 ('布洛维硬度（H）','洛氏、表面洛氏硬度，3个点起测',180.00,3,'LHH03','/','mechanics'),
	 ('压痕硬度(纳米硬度)（H）','纳米硬度/弹性模量，3个点起测',600.00,3,'LHH04','/','mechanics'),
	 ('压痕硬度(纳米硬度)（H）','纳米硬度/弹性模量，4个点起测',600.00,3,'LHH05','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('压痕硬度(纳米硬度)（H）','3D 硬度/模量',4000.00,3,'LHH08','/','mechanics'),
	 ('高温压缩（C）','单道次热压缩',500.00,3,'LHC01','/','mechanics'),
	 ('高温压缩（C）','多道次热压缩',550.00,3,'LHC02','/','mechanics'),
	 ('高温压缩（C）','动态CCT/TTT',550.00,3,'LHC03','/','mechanics'),
	 ('高温压缩（C）','高温压缩＞1000℃',600.00,3,'LHC04','/','mechanics'),
	 ('高温拉伸（T）','单轴热拉伸',500.00,3,'LHT01','/','mechanics'),
	 ('高温拉伸（T）','多道次热拉伸',550.00,3,'LHT02','/','mechanics'),
	 ('热处理（P）','普通热处理',400.00,3,'LHP01','/','mechanics'),
	 ('热处理（P）','静态CCT曲线/TTT曲线',450.00,3,'LHP02','/','mechanics'),
	 ('焊接模拟','扩散焊',400.00,3,'LHP06','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('焊接模拟','热压焊',450.00,3,'LHP07','/','mechanics'),
	 ('平面应变（C）','单道次平面应变压缩，常规样品尺寸',600.00,3,'LHC07','/','mechanics'),
	 ('平面应变','单道次平面应变压缩，大样品尺寸',800.00,3,'LHC08','/','mechanics'),
	 ('其他热模拟（F）','多向锻造',1200.00,3,'LHF01','/','mechanics'),
	 ('其他热模拟（F）','粉末烧结',700.00,3,'LHF02','/','mechanics'),
	 ('其他热模拟（F）','热机械疲劳(循环次数：≤50次)',500.00,3,'LHF03','/','mechanics'),
	 ('其他热模拟（F）','热机械疲劳(循环次数：50次≤cycle≤100次)',800.00,3,'LHF04','/','mechanics'),
	 ('金属静态拉伸(板状试样)','板材',80.00,3,'LXM01','/','machining'),
	 ('金属弯曲(板状试样)','板材',60.00,3,'LXM02','/','machining'),
	 ('金属断裂韧性(板状试样)','缺口',300.00,3,'LXM03','/','machining');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('金属蠕变(板状试样)','板材',100.00,3,'LXM04','/','machining'),
	 ('金属高速拉伸(板状试样)','板材',100.00,3,'LXM05','/','machining'),
	 ('薄膜拉伸(板状试样)','板材',120.00,3,'LXM06','GB/T 228.1、ASTM E8','machining'),
	 ('非金属拉伸','板材(不贴加强片)',60.00,3,'LXP01','/','machining'),
	 ('非金属拉伸-贴加强片','板材(含贴加强片82℃湿态以下)',180.00,3,'LXP02','/','machining'),
	 ('非金属压缩','板材(不贴加强片)',60.00,3,'LXP03','/','machining'),
	 ('非金属压缩-贴加强片','板材(含贴加强片82℃湿态以下)',180.00,3,'LXP04','/','machining'),
	 ('非金属弯曲','板材',60.00,3,'LXP05','/','machining'),
	 ('面内剪切','板材',60.00,3,'LXP06','/','machining'),
	 ('V型剪切','板材(带缺口)',120.00,3,'LXP07','/','machining');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('短梁剪切','板材',60.00,3,'LXP08','/','machining'),
	 ('开孔拉伸','板材(开孔)',90.00,3,'LXP12','/','machining'),
	 ('开孔压缩','板材(开孔)',90.00,3,'LXP13','/','machining'),
	 ('单钉双剪挤压','板材(开孔)',100.00,3,'LXP11','/','machining'),
	 ('冲击后压缩','板材',140.00,3,'LXP15','/','machining'),
	 ('充填孔拉伸、压缩','板材(开孔)',90.00,3,'LXP14','/','machining'),
	 ('无缺口冲击','板材(无缺口)',60.00,3,'LXP16','/','machining'),
	 ('缺口冲击','板材(缺口)',120.00,3,'LXP17','/','machining'),
	 ('复材断裂韧性','板材',60.00,3,'LXP18','/','machining'),
	 ('夹层结构弯曲','板材',60.00,3,'LXP19','/','machining');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('单搭接剪切','板材',60.00,3,'LXP09','/','machining'),
	 ('双搭接剪切','板材',100.00,3,'LXP10','ASTM D 3528','machining'),
	 ('滚筒剥离','板材',70.00,3,'LXP23','/','machining'),
	 ('夹层结构平拉','板材(切割+制样)',150.00,3,'LXP22','/','machining'),
	 ('玻璃化转变温度(DMA）','板材',60.00,3,'LXP24','/','machining'),
	 ('密度','板材',60.00,3,'LXP25','/','machining'),
	 ('树脂浇铸体','板材、哑铃型',100.00,3,'LXP26','GB/T 2567','machining'),
	 ('金属压缩(棒状试样)','棒材',80.00,3,'LXM08','GB/T 7314','machining'),
	 ('金属室温拉伸(棒状试样)','棒材',80.00,3,'LXM09','GB/T 228.1、ASTM E8','machining'),
	 ('金属室温蠕变(棒状试样)','棒材',100.00,3,'LXM10','ASTM E139、GB/T 2039','machining');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('金属高温持久(棒状试样)','棒材',150.00,3,'LXM11','ASTM E139、GB/T 2039','machining'),
	 ('金属高温蠕变(棒状试样)','棒材',150.00,3,'LXM12','ASTM E139、GB/T 2039','machining'),
	 ('陶瓷压缩','棒材',500.00,3,'LXS01','/','machining'),
	 ('陶瓷拉伸','棒材',800.00,3,'LXS02','/','machining'),
	 ('拉伸/持久/蠕变（高温合金）','棒材',150.00,3,'LXM13','ASTM E139、GB/T 2039','machining'),
	 ('普通疲劳','棒材, 普通',150.00,3,'LXM15','','machining'),
	 ('高温合金疲劳','棒材',200.00,3,'LXM16','','machining'),
	 ('疲劳仅纵抛','棒材、板材',80.00,3,'LXM17','GB/T 3075、ASTM E466、ASTM E606、GB/T 15248、GB/T 26077','machining'),
	 ('压痕硬度(纳米硬度)（H）','纳米压痕-断裂韧性',300.00,3,'LHH06','/','mechanics'),
	 ('压痕硬度(纳米硬度)（H）','划痕测试',500.00,3,'LHH07','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('高温压缩（C）','高温-DIC测应变，应变率10-3/s~10/s(RT~900℃)',1000.00,3,'LHC05','/','mechanics'),
	 ('高温拉伸（T）','高温拉伸＞1000℃',800.00,3,'LHT03','/','mechanics'),
	 ('高温拉伸（T）','高温-DIC测应变，应变率10-3/s~10/s(RT~900℃)',1000.00,3,'LHT04','/','mechanics'),
	 ('平面应变（C）','多道次平面应变压缩，常规样品尺寸',700.00,3,'LHC09','/','mechanics'),
	 ('平面应变（C）','多道次平面应变压缩，大样品尺寸',900.00,3,'LHC10','/','mechanics'),
	 ('热处理（P）','板带快速热处理(升温速率：100≤v＜300℃/s)',500.00,3,'LHP03','/','mechanics'),
	 ('热处理（P）','板带快速热处理(升温速率：300≤v＜500℃/s)',600.00,3,'LHP04','/','mechanics'),
	 ('状态调节(A)','状态调节-吸湿箱(-40℃~10℃)',40.00,3,'LRA05','/','mechanics'),
	 ('焊接模拟（P）','焊接热影响区模拟',500.00,3,'LHP08','/','mechanics'),
	 ('X射线光电子能谱仪（X）','常规扫描(常温/高温/低温 元素含量、价态、深度分析、面扫、线扫)',800.00,2,'CPX01','GB/T 19500 -2004   ','ComponentAnalysis');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('X射线光电子能谱仪（X）','UPS分析',800.00,2,'CPX02','GB/T 19500 -2004   ','ComponentAnalysis'),
	 ('X射线光电子能谱仪（X）','IPES+UPS',2500.00,2,'CPX03','GB/T 19500 -2004   ','ComponentAnalysis'),
	 ('XRF荧光光谱仪','块体/粉末/液体氧化物、元素含量分析',400.00,2,'CPR01','GB/T 36164-2018（高合金钢）','ComponentAnalysis'),
	 ('XRF荧光光谱仪','固体点、面成分分析',400.00,2,'CPR02','GB/T 36164-2018（高合金钢）','ComponentAnalysis'),
	 ('XRF荧光光谱仪','膜厚测试',400.00,2,'CPR03','GB/T 36164-2018（高合金钢）','ComponentAnalysis'),
	 ('火花直读','铁基/镍基/铜基/钴基/钛基成分分析',400.00,2,'','/','ComponentAnalysis'),
	 ('辉光放电高分辨双聚焦磁质谱仪（G）','块状金属纯度',2000.00,2,'CPG01','ISO/TS 15338-2020 ','ComponentAnalysis'),
	 ('辉光放电高分辨双聚焦磁质谱仪（G）','金属深度分析-10um以内，10个元素以内',2500.00,2,'CPG02','ISO/TS 15338-2020 ','ComponentAnalysis'),
	 ('辉光放电高分辨双聚焦磁质谱仪（G）','金属深度分析-100um 以内，10个元素以内',4000.00,2,'CPG02','ISO/TS 15338-2020 ','ComponentAnalysis'),
	 ('辉光放电高分辨双聚焦磁质谱仪（G）','金属深度分析-200um以内，10个元素以内',5000.00,2,'CPG02','ISO/TS 15338-2020 ','ComponentAnalysis');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('辉光放电高分辨双聚焦磁质谱仪（G）','金属深度分析-500um以内，10个元素以内',6000.00,2,'CPG02','ISO/TS 15338-2020 ','ComponentAnalysis'),
	 ('-','-',0.00,2,'','/',NULL),
	 ('辉光放电高分辨双聚焦磁质谱仪（G）','绝缘体纯度（氧化铝、氧化硅等）',2500.00,2,'CPG05','ISO/TS 15338-2020 ','ComponentAnalysis'),
	 ('辉光放电高分辨双聚焦磁质谱仪（G）','6N高纯石墨、SiC',2500.00,2,'CPG06','ISO/TS 15338-2020 ','ComponentAnalysis'),
	 ('物理吸附仪（P）','BET比表面积',300.00,2,'CPP01','GB/T 19587-2017','ComponentAnalysis'),
	 ('物理吸附仪（P）','介孔材料：比表面积+孔径',500.00,2,'CPP02','GB/T 19587-2017','ComponentAnalysis'),
	 ('物理吸附仪（P）','微孔材料：比表面积+孔径',600.00,2,'CPP03','GB/T 19587-2017','ComponentAnalysis'),
	 ('化学吸附','程序升温还原（TPR）、程序升温脱附（TPD）、程序升温氧化（TPO）、化学脉冲吸附',500.00,2,'','/','ComponentAnalysis'),
	 ('同步热分析-质谱-红外联用（S）','热分析-质谱-红外联用分析（RT~600℃）',600.00,2,'CTS01','GB T 36402-2018','Thermoanalysis'),
	 ('同步热分析-质谱-红外联用（S）','热分析-质谱-红外联用分析（600~1000℃）',800.00,2,'CTS02','GB T 36402-2018','Thermoanalysis');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('同步热分析-质谱-红外联用（S）','热分析-质谱-红外联用分析（1000~1600℃）',1200.00,2,'CTS03','GB T 36402-2018','Thermoanalysis'),
	 ('同步热分析-质谱-红外联用（S）','热分析-质谱常规定量（RT~600℃）',800.00,2,'CTS04','GB T 36402-2018','Thermoanalysis'),
	 ('同步热分析-质谱-红外联用（S）','热分析-质谱常规定量（600~1000℃）',1000.00,2,'CTS05','GB T 36402-2018','Thermoanalysis'),
	 ('同步热分析-质谱-红外联用（S）','热分析-质谱常规定量（1000~1600℃）',1400.00,2,'CTS06','GB T 36402-2018','Thermoanalysis'),
	 ('同步热分析-质谱-红外联用（S）','热分析-质谱未知定量（RT~600℃）',1200.00,2,'CTS07','GB T 36402-2018','Thermoanalysis'),
	 ('同步热分析-质谱-红外联用（S）','热分析-质谱未知定量（600~1000℃）',1500.00,2,'CTS08','GB T 36402-2018','Thermoanalysis'),
	 ('同步热分析-质谱-红外联用（S）','热分析-质谱未知定量（1000~1600℃）',2000.00,2,'CTS09','GB T 36402-2018','Thermoanalysis'),
	 ('同步热分析-质谱-红外联用（S）','同步热分析STA（RT~600℃）',400.00,2,'CTS10','GB T 19466.3-2004  GB T 13464-2008  GB T 14837-2014  GB T 13021-1991 ','Thermoanalysis'),
	 ('同步热分析-质谱-红外联用（S）','同步热分析STA（600~1000℃）',600.00,2,'CTS11','GB T 19466.3-2004  GB T 13464-2008  GB T 14837-2014  GB T 13021-1991','Thermoanalysis'),
	 ('同步热分析-质谱-红外联用（S）','同步热分析STA（1000~1600℃）',800.00,2,'CTS12','GB T 19466.3-2004  GB T 13464-2008  GB T 14837-2014  GB T 13021-1991','Thermoanalysis');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('同步热分析-质谱-红外联用（S）','比热容（600~1000℃）',1200.00,2,'CTS13','ASTM E 1269-11','Thermoanalysis'),
	 ('同步热分析-质谱-红外联用（S）','比热容（600~1000℃）两个样品及以上',1000.00,2,'CTS13','ASTM E 1269-11','Thermoanalysis'),
	 ('同步热分析-质谱-红外联用（S）','活化能/指前因子',3000.00,2,'CTS14','GB/T 33047.2','Thermoanalysis'),
	 ('红外光谱仪（F）','红外光谱',200.00,2,'CTF01','GB/T 6040-2019','Thermoanalysis'),
	 ('红外光谱仪（F）','显微红外',500.00,2,'CTF02','GB/T 6040-2019','ChemicalAnalysis'),
	 ('拉曼光谱仪（R）','普通拉曼光谱',400.00,2,'CTR01','GB/T 40219-2021','Thermoanalysis'),
	 ('拉曼光谱仪（R）','变温拉曼光谱',1500.00,2,'CTR02','GB/T 40219-2021','Thermoanalysis'),
	 ('差式扫描量热仪（D）','比热容（室温）',600.00,2,'CTD01','ASTM E 1269-11','Thermoanalysis'),
	 ('差式扫描量热仪（D）','比热容（RT~600℃）',800.00,2,'CTD02','ASTM E 1269-11','Thermoanalysis'),
	 ('差式扫描量热仪（D）','比热容（-100~600℃）',1000.00,2,'CTD03','ASTM E 1269-11','Thermoanalysis');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('差式扫描量热仪（D）','比热容（室温）两个样品及以上',400.00,2,'CTD01','ASTM E 1269-11','Thermoanalysis'),
	 ('差式扫描量热仪（D）','比热容（RT~600℃）两个样品及以上',600.00,2,'CTD02','ASTM E 1269-11','Thermoanalysis'),
	 ('差式扫描量热仪（D）','比热容（-100~600℃）两个样品及以上',800.00,2,'CTD03','ASTM E 1269-11','Thermoanalysis'),
	 ('差式扫描量热仪（D）','玻璃化转变温度（-150℃~RT）',700.00,2,'CTD04','ASTM E 1356-98','Thermoanalysis'),
	 ('差式扫描量热仪（D）','玻璃化转变温度（RT~300℃）',500.00,2,'CTD05','ASTM E 1356-98','Thermoanalysis'),
	 ('固化度、熔融与结晶、氧化诱导温度','-150~300℃',600.00,2,'','/',NULL),
	 ('固化度、熔融与结晶、氧化诱导温度','-150~600℃',800.00,2,'','/',NULL),
	 ('固化度、熔融与结晶、氧化诱导温度','RT~300℃',300.00,2,'','/',NULL),
	 ('固化度、熔融与结晶、氧化诱导温度','300~600℃',400.00,2,'','/',NULL),
	 ('热膨胀仪（E）','线膨胀系数(RT~300℃)',300.00,2,'CTE01','GB-T 4339-2008','Thermoanalysis');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('热膨胀仪（E）','线膨胀系数(RT~600℃)',500.00,2,'CTE02','GB-T 4339-2008','Thermoanalysis'),
	 ('热膨胀仪（E）','线膨胀系数(600~1000℃)',700.00,2,'CTE03','GB-T 4339-2008','Thermoanalysis'),
	 ('热膨胀仪（E）','线膨胀系数(1000~1600℃)',1200.00,2,'CTE04','GB-T 4339-2008','Thermoanalysis'),
	 ('热膨胀仪（E）','线膨胀系数(1600~2000℃)',2000.00,2,'CTE05','GB-T 4339-2008','Thermoanalysis'),
	 ('热机械分析仪（TMA）（T）','膨胀系数(-50~400℃)',800.00,2,'CTT01','GB/T 36800.2-2018','Thermoanalysis'),
	 ('热机械分析仪（TMA）（T）','膨胀系数(RT~300℃)',300.00,2,'CTT02','GB/T 36800.2-2018','Thermoanalysis'),
	 ('热机械分析仪（TMA）（T）','膨胀系数(RT~600℃)',500.00,2,'CTT03','GB/T 36800.2-2018','Thermoanalysis'),
	 ('热机械分析仪（TMA）（T）','膨胀系数(RT~1000℃)',700.00,2,'CTT04','GB/T 36800.2-2018','Thermoanalysis'),
	 ('激光导热仪（L）','热扩散系数（RT~500℃）',300.00,2,'CTL01','GB-T 22588-2008','Thermoanalysis'),
	 ('激光导热仪（L）','热扩散系数（-100~RT）',300.00,2,'CTL02','GB-T 22588-2008','Thermoanalysis');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('激光导热仪（L）','导热系数(导热仪测比热)（RT~500℃）',300.00,2,'CTL03','GB-T 22588-2008','Thermoanalysis'),
	 ('比重计（G）','常温密度',200.00,2,'CTG01','ASTM D297-93','Thermoanalysis'),
	 ('动态热机械分析仪（M）','玻璃化转变温度（RT-300℃）',600.00,2,'CTM01','ASTM D4065-12','Thermoanalysis'),
	 ('动态热机械分析仪（M）','玻璃化转变温度（ -100~100℃）',800.00,2,'CTM02','ASTM D4065-12','Thermoanalysis'),
	 ('动态热机械分析仪（M）','玻璃化转变温度（-100~300℃）',1000.00,2,'CTM03','ASTM D4065-12','Thermoanalysis'),
	 ('动态热机械分析仪（M）','拉伸强度、模量（室温）',200.00,2,'CTM10','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','拉伸强度、模量（RT~150℃）',300.00,2,'CTM11','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','拉伸强度、模量（150~300℃）',400.00,2,'CTM12','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','拉伸强度、模量（300~500℃）',500.00,2,'CTM13','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','拉伸强度、模量（500~900℃）',700.00,2,'CTM14','/','Thermoanalysis');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('动态热机械分析仪（M）','拉伸强度、模量（-50℃~RT）',500.00,2,'CTM15','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','拉伸强度、模量（-50~-100℃）',600.00,2,'CTM16','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','弯曲强度（室温）',200.00,2,'CTM24','GB 14390-2008 ','Thermoanalysis'),
	 ('动态热机械分析仪（M）','弯曲强度（RT~150℃）',300.00,2,'CTM25','GB 14390-2008 ','Thermoanalysis'),
	 ('动态热机械分析仪（M）','弯曲强度（150~300℃）',400.00,2,'CTM26','GB 14390-2008 ','Thermoanalysis'),
	 ('动态热机械分析仪（M）','弯曲强度（300~500℃）',500.00,2,'CTM27','GB 14390-2008 ','Thermoanalysis'),
	 ('动态热机械分析仪（M）','弯曲强度（500~900℃）',800.00,2,'CTM28','GB 14390-2008 ','Thermoanalysis'),
	 ('动态热机械分析仪（M）','弯曲强度（900-1500℃）',1000.00,2,'CTM29','GB 14390-2008 ','Thermoanalysis'),
	 ('动态热机械分析仪（M）','弯曲强度（-50℃-RT）',500.00,2,'CTM30','GB 14390-2008 ','Thermoanalysis'),
	 ('动态热机械分析仪（M）','弯曲强度（-50~-100℃）',600.00,2,'CTM31','GB 14390-2008 ','Thermoanalysis');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('动态热机械分析仪（M）','剪切模量（RT-100℃）',500.00,2,'CTM32','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','剪切模量（-100~100℃）',700.00,2,'CTM33','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','频率扫描（RT~500℃）',1000.00,2,'CTM34','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','频率扫描（500~900℃）',1200.00,2,'CTM35','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','频率扫描（900~1500℃）',1500.00,2,'CTM36','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','频率扫描（-100~RT）',1500.00,2,'CTM37','/','Thermoanalysis'),
	 ('旋转流变仪（V）','黏度',500.00,2,'CTV01','JY/T 0590-2020','Thermoanalysis'),
	 ('旋转流变仪（V）','凝胶化时间',500.00,2,'CTV02','JY/T 0590-2020','Thermoanalysis'),
	 ('液体颗粒计数器（L）','液体中0.1um~0.5um尺寸颗粒物含量测试',800.00,2,'CCL01','SJ/T 11638-2016','ChemicalAnalysis'),
	 ('卡尔费休水分仪（K）','水分含量测定',300.00,2,'CCK01','GB/T 6283-2008','ChemicalAnalysis');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('电位滴定仪（P）','酸碱滴定',300.00,2,'CCP01','GB/T 9725-2007(通则)','ChemicalAnalysis'),
	 ('热裂解GCMS','有机大分子成分测试',800.00,2,'CCT01','客户提供相关测试需求','ChemicalAnalysis'),
	 ('紫外分光光度计（U）','吸光度、透过率',300.00,2,'CCU01','GB/T 26813-2011','ChemicalAnalysis'),
	 ('马弗炉（F）','灰分',600.00,2,'CCF01','客户提供相关测试需求','ChemicalAnalysis'),
	 ('马弗炉（F）','纤维体积含量',600.00,2,'CCF02','客户提供相关测试需求','ChemicalAnalysis'),
	 ('样品前处理（R）','有机',300.00,2,'CCR01','/','ChemicalAnalysis'),
	 ('样品前处理（R）','无机',100.00,2,'CCR02','/','ChemicalAnalysis'),
	 ('TEM','FIB制样+TEM测试',5000.00,1,'','/',NULL),
	 ('TEM','TEM形貌、选区电子衍射、高分辨像、EDS能谱',1200.00,1,'','/',NULL),
	 ('样品前处理 (Y)','喷金',100.00,1,'MPY01','/','SP');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('常规金相制样 (N)
（金属平均晶粒度测定
非金属夹杂物显微评定
金属的显微组织评定）','孔隙率制样（含简单数据处理）',600.00,1,'MPN01','/','SP'),
	 ('样品前处理 (Y)','高真空喷碳、喷铬',150.00,1,'MPY02','/','SP'),
	 ('常规金相制样 (N)
（金属平均晶粒度测定
非金属夹杂物显微评定
金属的显微组织评定）','钢铁样品',600.00,1,'MPN02','/','SP'),
	 ('常规金相制样 (N)
（金属平均晶粒度测定
非金属夹杂物显微评定
金属的显微组织评定）','钛合金、镍基合金',700.00,1,'MPN03','/','SP'),
	 ('常规金相制样 (N)
（金属平均晶粒度测定
非金属夹杂物显微评定
金属的显微组织评定）','铝合金',800.00,1,'MPN04','/','SP'),
	 ('EBSD制样（含振动抛光）(E)','钢铁样品',800.00,1,'MPE01','/','SP'),
	 ('EBSD制样（含振动抛光）(E)','铝合金、钛合金、镍基合金',1000.00,1,'MPE02','/','SP'),
	 ('EBSD制样（含振动抛光）(E)','原位EBSD制样（常规金属）',1000.00,1,'MPE05','/','SP'),
	 ('抛光处理 (P)','只做振动抛光',500.00,1,'MPP01','/','SP'),
	 ('抛光处理 (P)','CP抛光制样',300.00,1,'MPP02','/','SP');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('抛光处理 (P)','CP制备截面',300.00,1,'MPP03','/','SP'),
	 ('常规TEM制样','离子减薄',600.00,1,'MPT01','/','SP'),
	 ('常规TEM制样','电解双喷',500.00,1,'MPT03','/','SP'),
	 ('常规TEM制样','透射制样',1000.00,1,'MPT04','/','SP'),
	 ('单项制样 (S)','简单磨抛',100.00,1,'MPS01','/','SP'),
	 ('单项制样 (S)','精密切割机（半导体电路板）',100.00,1,'MPS02','/','SP'),
	 ('单项制样 (S)','砂轮切割机（金属类）',100.00,1,'MPS03','/','SP'),
	 ('单项制样 (S)','样品镶嵌（冷/热镶嵌）',100.00,1,'MPS04','/','SP'),
	 ('单项制样 (S)','线锯（半导体 陶瓷 碳纤维）',100.00,1,'MPS05','/','SP'),
	 ('全自动显微硬度计(A)','显微维氏硬度',80.00,1,'MHA01','/','SP');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('2D X-RAY（T）','2D X-ray，焊锡空洞检查、缺陷定位等',500.00,1,'MRT01','/','DPA'),
	 ('高分辨率三维分析系统 (H)','3D X-ray（Micro-CT）',1500.00,1,'MRH01','/','DPA'),
	 ('高分辨率三维分析系统 (H)','3D X-ray（工业CT）225/240KV-GE Phoenix 240',2500.00,1,'MRH02','/','DPA'),
	 ('高分辨率三维分析系统 (H)','3D X-ray（工业CT）
300KV-GE phoenix 300',3000.00,1,'MRH03','/','DPA'),
	 ('高分辨率三维分析系统 (H)','3D X-ray（工业CT）
450KV-YXLON FF85',4000.00,1,'MRH04','/','DPA'),
	 ('高分辨率三维分析系统 (H)','多场耦合下4D原位CT
（载荷、温度、腐蚀条件）',3000.00,1,'MRH05','/','DPA'),
	 ('原子力显微镜(F)','表面粗糙度测量',600.00,1,'MAF01','/','DPA'),
	 ('原子力显微镜(F)','静电力显微镜(EFM)',800.00,1,'MAF02','/','DPA'),
	 ('原子力显微镜(F)','导电原子力显微镜（C-AFM）',800.00,1,'MAF03','/','DPA'),
	 ('原子力显微镜(F)','扫描电容显微镜（SCM）',800.00,1,'MAF04','/','DPA');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('原子力显微镜(F)','开尔文探针力显微镜（KPFM）',800.00,1,'MAF05','/','DPA'),
	 ('超声波显微镜(S)','检测样品内部不同位置的脱层(Delaminaiton)、裂缝(Crack)、气洞及粘着状况，多用于检查芯片封胶内的缺陷。',400.00,1,'MCS01','/','DPA'),
	 ('力学项目负责人','/',0.00,3,'','/','mechanics'),
	 ('火花放电直读光谱仪 （S）','铁基 成分分析',400.00,2,'CPS01','GB/T 4336-2016（低合金钢）','ComponentAnalysis'),
	 ('火花放电直读光谱仪 （S）','镍基 成分分析',400.00,2,'CPS02','GB/T 4336-2016（低合金钢）','ComponentAnalysis'),
	 ('火花放电直读光谱仪 （S）','铜基 成分分析',400.00,2,'CPS03','GB/T 4336-2016（低合金钢）','ComponentAnalysis'),
	 ('火花放电直读光谱仪 （S）','钴基 成分分析',400.00,2,'CPS04','GB/T 4336-2016（低合金钢）','ComponentAnalysis'),
	 ('火花放电直读光谱仪 （S）','钛基 成分分析',400.00,2,'CPS05','GB/T 4336-2016（低合金钢）','ComponentAnalysis'),
	 ('辉光放电高分辨双聚焦磁质谱仪（G）','半导体纯度',2000.00,2,'CPG03','ISO/TS 15338-2020 ','ComponentAnalysis'),
	 ('辉光放电高分辨双聚焦磁质谱仪（G）','普通石墨纯度',2000.00,2,'CPG04','ISO/TS 15338-2020 ','ComponentAnalysis');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('无机C、S分析仪（A）','块体/粉末C含量分析',200.00,2,'','GB/T 20123-2006','ChemicalAnalysis'),
	 ('无机C、S分析仪（A）','块体/粉末S含量分析',200.00,2,'','GB/T 20123-2006','ChemicalAnalysis'),
	 ('无机O、N、H分析仪（A）','块体/粉末O含量分析',200.00,2,'','GB/T 14265-2017 （通则）','ChemicalAnalysis'),
	 ('无机O、N、H分析仪（A）','块体/粉末N含量分析',200.00,2,'','GB/T 14265-2017 （通则）','ChemicalAnalysis'),
	 ('无机O、N、H分析仪（A）','块体/粉末H含量分析',200.00,2,'','GB/T 14265-2017 （通则）','ChemicalAnalysis'),
	 ('有机C、S、O、N、H分析仪（A）','块体/粉末/液体C含量分析',200.00,2,'','GBT 19143-2017','ChemicalAnalysis'),
	 ('有机C、S、O、N、H分析仪（A）','块体/粉末/液体S含量分析',200.00,2,'','GBT 19143-2017','ChemicalAnalysis'),
	 ('有机C、S、O、N、H分析仪（A）','块体/粉末/液体O含量分析',200.00,2,'','GBT 19143-2017','ChemicalAnalysis'),
	 ('有机C、S、O、N、H分析仪（A）','块体/粉末/液体N含量分析',200.00,2,'','GBT 19143-2017','ChemicalAnalysis'),
	 ('有机C、S、O、N、H分析仪（A）','块体/粉末/液体H含量分析',200.00,2,'','GBT 19143-2017','ChemicalAnalysis');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('化学吸附仪（C）','程序升温还原（TPR）',500.00,2,'CPC01','实验室方法','ComponentAnalysis'),
	 ('化学吸附仪（C）','程序升温脱附（TPD）',500.00,2,'CPC02','实验室方法','ComponentAnalysis'),
	 ('化学吸附仪（C）','程序升温氧化（TPO）',500.00,2,'CPC03','实验室方法','ComponentAnalysis'),
	 ('化学吸附仪（C）','化学脉冲吸附',500.00,2,'CPC04','实验室方法','ComponentAnalysis'),
	 ('同步热分析-质谱-红外联用（S）','其他',0.00,2,'CTS15','/','Thermoanalysis'),
	 ('差式扫描量热仪（D）','固化度（-150~300℃）',600.00,2,'CTD06','ASTM D 5028-96','Thermoanalysis'),
	 ('差式扫描量热仪（D）','固化度（-150~600℃）',800.00,2,'CTD07','ASTM D 5028-96','Thermoanalysis'),
	 ('差式扫描量热仪（D）','固化度（RT~300℃）',300.00,2,'CTD08','ASTM D 5028-96','Thermoanalysis'),
	 ('差式扫描量热仪（D）','固化度（300~600℃）',400.00,2,'CTD09','ASTM D 5028-96','Thermoanalysis'),
	 ('差式扫描量热仪（D）','熔融与结晶（-150~300℃）',600.00,2,'CTD10','GB-T 19466.3-2004','Thermoanalysis');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('差式扫描量热仪（D）','熔融与结晶（-150~600℃）',800.00,2,'CTD11','GB-T 19466.3-2004','Thermoanalysis'),
	 ('差式扫描量热仪（D）','熔融与结晶（RT~300℃）',300.00,2,'CTD12','ASTM D 5028-96','Thermoanalysis'),
	 ('差式扫描量热仪（D）','熔融与结晶（300~600℃）',400.00,2,'CTD13','GB-T 19466.3-2004','Thermoanalysis'),
	 ('差式扫描量热仪（D）','氧化诱导温度（-150~300℃）',600.00,2,'CTD14','ASTM D 3895-80','Thermoanalysis'),
	 ('差式扫描量热仪（D）','氧化诱导温度（-150~600℃）',800.00,2,'CTD15','ASTM D 3895-80','Thermoanalysis'),
	 ('差式扫描量热仪（D）','氧化诱导温度（RT~300℃）',300.00,2,'CTD16','ASTM D 3895-80','Thermoanalysis'),
	 ('差式扫描量热仪（D）','氧化诱导温度（300~600℃）',400.00,2,'CTD17','ASTM D 3895-80','Thermoanalysis'),
	 ('差式扫描量热仪（D）','比热容（MDSC)（-150~300℃）',1500.00,2,'CTD18','/','Thermoanalysis'),
	 ('差式扫描量热仪（D）','比热容（MDSC)（-150~600℃）',1300.00,2,'CTD19','/','Thermoanalysis'),
	 ('差式扫描量热仪（D）','比热容（MDSC)（RT~300℃）',1000.00,2,'CTD20','/','Thermoanalysis');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('差式扫描量热仪（D）','比热容（MDSC)（300~600℃）',1200.00,2,'CTD21','/','Thermoanalysis'),
	 ('差式扫描量热仪（D）','玻璃化转变温度（MDSC)（RT~300℃）',800.00,2,'CTD22','ASTM E2602-09','Thermoanalysis'),
	 ('差式扫描量热仪（D）','玻璃化转变温度（MDSC)（-150℃-RT）',1100.00,2,'CTD23','ASTM E2602-09','Thermoanalysis'),
	 ('差式扫描量热仪（D）','其他',0.00,2,'CTD24','/','Thermoanalysis'),
	 ('热膨胀仪（E）','其他',0.00,2,'CTE06','/','Thermoanalysis'),
	 ('热机械分析仪（TMA）（T）','玻璃化转变温度(-50~400℃)',800.00,2,'CTT05','GB/T 36800.2-2018','Thermoanalysis'),
	 ('热机械分析仪（TMA）（T）','玻璃化转变温度(RT~300℃)',300.00,2,'CTT06','GB/T 36800.2-2018','Thermoanalysis'),
	 ('热机械分析仪（TMA）（T）','玻璃化转变温度(RT~600℃)',500.00,2,'CTT07','GB/T 36800.2-2018','Thermoanalysis'),
	 ('热机械分析仪（TMA）（T）','玻璃化转变温度(RT~1000℃)',700.00,2,'CTT08','GB/T 36800.2-2018','Thermoanalysis'),
	 ('热机械分析仪（TMA）（T）','其他',0.00,2,'CTT09','GB/T 36800.2-2018','Thermoanalysis');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('激光导热仪（L）','导热系数(导热仪测比热)（-100℃~RT）',300.00,2,'CTL04','GB-T 22588-2008','Thermoanalysis'),
	 ('激光导热仪（L）','其他',0.00,2,'CTL05','GB-T 22588-2008','Thermoanalysis'),
	 ('动态热机械分析仪（M）','储能模量、损耗模量（RT-300℃）',600.00,2,'CTM04','ASTM D4065-12','Thermoanalysis'),
	 ('动态热机械分析仪（M）','储能模量、损耗模量（ -100~100℃）',800.00,2,'CTM05','ASTM D4065-12','Thermoanalysis'),
	 ('动态热机械分析仪（M）','储能模量、损耗模量（-100~300℃）',1000.00,2,'CTM06','ASTM D4065-12','Thermoanalysis'),
	 ('动态热机械分析仪（M）','损耗因子（RT-300℃）',600.00,2,'CTM07','ASTM D4065-12','Thermoanalysis'),
	 ('动态热机械分析仪（M）','损耗因子（ -100~100℃）',800.00,2,'CTM08','ASTM D4065-12','Thermoanalysis'),
	 ('动态热机械分析仪（M）','损耗因子（-100~300℃）',1000.00,2,'CTM09','ASTM D4065-12','Thermoanalysis'),
	 ('动态热机械分析仪（M）','压缩强度、模量（室温）',200.00,2,'CTM17','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','压缩强度、模量（RT~150℃）',300.00,2,'CTM18','/','Thermoanalysis');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('动态热机械分析仪（M）','压缩强度、模量（150~300℃）',400.00,2,'CTM19','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','压缩强度、模量（300~500℃）',500.00,2,'CTM20','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','压缩强度、模量（500~900℃）',700.00,2,'CTM21','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','压缩强度、模量（-50℃~RT）',500.00,2,'CTM22','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','压缩强度、模量（-50~-100℃）',600.00,2,'CTM23','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','应变扫描（RT~500℃）',1000.00,2,'CTM38','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','应变扫描（500~900℃）',1200.00,2,'CTM39','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','应变扫描（900~1500℃）',1500.00,2,'CTM40','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','应变扫描（-100℃~RT）',1500.00,2,'CTM41','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','应力松弛（RT~500℃）',1000.00,2,'CTM42','/','Thermoanalysis');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('动态热机械分析仪（M）','应力松弛（500~900℃）',1200.00,2,'CTM43','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','应力松弛（900~1500℃）',1500.00,2,'CTM44','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','应力松弛（-100℃~RT）',1500.00,2,'CTM45','/','Thermoanalysis'),
	 ('动态热机械分析仪（M）','其他',0.00,2,'CTM46','/','Thermoanalysis'),
	 ('电感耦合等离子体串联质谱仪（洁净间）(M)','针对电子级水、酸、有机试剂中超痕量元素测试',4000.00,2,'CCM01','SJ/T 11637-2016(通则)  ','ChemicalAnalysis'),
	 ('电感耦合等离子体串联质谱仪（洁净间）(M)','电子级硅表金属元素测试',4000.00,2,'CCM02','GB/T 39145-2020','ChemicalAnalysis'),
	 ('电感耦合等离子体串联质谱仪（洁净间）(M)','电子级多晶硅体金属测试',4000.00,2,'CCM03','GB/T 37049-2018','ChemicalAnalysis'),
	 ('离子色谱（C）','溶液中阴离子含量测试',400.00,2,'CCC01','JY/T 0575-2020(通则)','ChemicalAnalysis'),
	 ('电位滴定仪（P）','沉淀滴定',300.00,2,'CCP02','GB/T 9725-2007(通则)','ChemicalAnalysis'),
	 ('气相色谱-质谱联用仪(GC-MS)（G）','有机成分测试-定性分析',600.00,2,'CCG01','客户提供相关测试需求','ChemicalAnalysis');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('气相色谱-质谱联用仪(GC-MS)（G）','有机成分测试-定量分析',1000.00,2,'CCG02','客户提供相关测试需求','ChemicalAnalysis'),
	 ('凝胶渗透色谱(GPC)（G）','聚合物分子量及分子量分布测试',600.00,2,'CCG03','GB/T 27843-2011','ChemicalAnalysis'),
	 ('高温凝胶渗透色谱(GPC)（G）','聚合物分子量及分子量分布测试',1500.00,2,'CCG04','SN/T 4183-2015','ChemicalAnalysis'),
	 ('液相色谱-质谱联用仪（LC-MS）（S）','有机酸及有机物分析',500.00,2,'CCS01','客户提供相关测试需求','ChemicalAnalysis'),
	 ('电感耦合等离子体-质谱仪（ICP-MS）(S)','痕量元素含量测试',1000.00,2,'CCS02','GB/T 30903-2014','ChemicalAnalysis'),
	 ('电感耦合等离子体发射光谱仪（ICP-OES）(S)','微量元素含量测试',800.00,2,'CCS03','GB/T 30902-2014','ChemicalAnalysis'),
	 ('原子吸收光谱仪（带石墨炉）（AAS）（A）','微量及痕量元素含量测试',600.00,2,'CCA01','GB/T 15337-2008','ChemicalAnalysis'),
	 ('马弗炉（F）','其他',600.00,2,'CCF03','/','ChemicalAnalysis'),
	 ('FIB离子束加工（B）','常规截面',2000.00,1,'MFB01','/','FIBTEM'),
	 ('截面TEM制样（S）','Si基体',3000.00,1,'MFS01','/','FIBTEM');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('截面TEM制样（S）','铁、铜、铝',4000.00,1,'MFS02','/','FIBTEM'),
	 ('截面TEM制样（S）','W、金刚石',5000.00,1,'MFS03','/','FIBTEM'),
	 ('截面TEM制样（S）','特殊要求',2000.00,1,'MFS04','/','FIBTEM'),
	 ('平面TEM制样（P）','Si基体',3500.00,1,'MFP01','/','FIBTEM'),
	 ('平面TEM制样（P）','铁、铜、铝',4500.00,1,'MFP02','/','FIBTEM'),
	 ('平面TEM制样（P）','W、金刚石',5500.00,1,'MFP03','/','FIBTEM'),
	 ('平面TEM制样（P）','特殊要求',2000.00,1,'MFP04','/','FIBTEM'),
	 ('三维重构（R）','三维重构',2000.00,1,'MFR01','/','FIBTEM'),
	 ('激光加工+FIB（L）','常规',3000.00,1,'MFL01','/','FIBTEM'),
	 ('激光加工+FIB（L）','定点',4000.00,1,'MFL02','/','FIBTEM');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('TOF-SIMS+FIB联用（T）','TOF-SIMS+FIB联用',2000.00,1,'MFT01','/','FIBTEM'),
	 ('高分辨场发射透射电子显微镜(H)','TEM形貌',1200.00,1,'MTH01','JY/T 0581-2020','FIBTEM'),
	 ('高分辨场发射透射电子显微镜(H)','选区电子衍射',1200.00,1,'MTH02','JY/T 0581-2020','FIBTEM'),
	 ('高分辨场发射透射电子显微镜(H)','高分辨像',1200.00,1,'MTH03','JY/T 0581-2020','FIBTEM'),
	 ('高分辨场发射透射电子显微镜(H)','EDS能谱（点、线、区域、面扫）',1200.00,1,'MTH04','JY/T 0581-2020','FIBTEM'),
	 ('高分辨场发射透射电子显微镜(H)','FIB制样+TEM测试',5000.00,1,'MTH05','JY/T 0581-2020','FIBTEM'),
	 ('高分辨场发射透射电子显微镜(H)','其他',0.00,1,'MTH06','JY/T 0581-2020','FIBTEM'),
	 ('SEM (S)','钨灯丝SEM',400.00,1,'MSS01','JY/T 0584-2020
GB/T 17359-2012','SEMXRD'),
	 ('SEM (S)','热场发射SEM',600.00,1,'MSS02','JY/T 0584-2020
GB/T 17359-2012','SEMXRD'),
	 ('SEM (S)','原位室温加载SEM',8000.00,1,'MSS03','GB/T 19501-2013','SEMXRD');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('SEM (S)','原位高温加载SEM',10000.00,1,'MSS04','GB/T 19501-2013','SEMXRD'),
	 ('SEM (S)','环境场发射SEM',600.00,1,'MSS05','/','SEMXRD'),
	 ('SEM (S)','冷场发射SEM',600.00,1,'MSS06','/','SEMXRD'),
	 ('SEM+EDS (D)','钨灯丝SEM+EDS',400.00,1,'MSD01','JY/T 0584-2020','SEMXRD'),
	 ('SEM+EDS (D)','热场发射SEM+EDS',600.00,1,'MSD02','JY/T 0584-2020','SEMXRD'),
	 ('SEM+EDS (D)','环境场发射SEM+EDS',600.00,1,'MSD03','/','SEMXRD'),
	 ('SEM+EDS (D)','冷场发射SEM+EDS',600.00,1,'MSD04','/','SEMXRD'),
	 ('TKD (T)','TKD（同轴）',1000.00,1,'MST01','/','SEMXRD'),
	 ('TKD (T)','TKD（离轴）',600.00,1,'MST02','/','SEMXRD'),
	 ('EBSD (E)','EBSD',600.00,1,'MSE01','/','SEMXRD');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('EBSD (E)','原位室温加载EBSD',8000.00,1,'MSE02','GB/T 19501-2013','SEMXRD'),
	 ('EBSD (E)','原位高温加载EBSD',10000.00,1,'MSE03','GB/T 19501-2013','SEMXRD'),
	 ('场发射EPMA (P)','点扫，线扫，面扫',1000.00,1,'MSP01','/','SEMXRD'),
	 ('常规金相制样 (N)','其他',0.00,1,'MPN05','/','SP'),
	 ('EBSD制样（含振动抛光）(E)','双相及以上材料EBSD制样（做KAM图分析，要求完全无划痕）',1500.00,1,'MPE03','/','SP'),
	 ('EBSD制样（含振动抛光）(E)','断口区域/边缘区域样品',1300.00,1,'MPE04','/','SP'),
	 ('EBSD制样（含振动抛光）(E)','其他',0.00,1,'MPE06','/','SP'),
	 ('抛光处理 (P)','电解抛光',200.00,1,'MPP04','/','SP'),
	 ('常规TEM制样 (T)','离子减薄（断口，指定薄区位置样品）',1200.00,1,'MPT02','/','SP'),
	 ('高分辨率三维分析系统 (H)','三维数据处理： （缺陷的三维空间分布、孔隙率、粒径、表面积、比表面积分布等参数计算）',0.00,1,'MRH06','/','SEMXRD');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('高灵敏度X射线衍射仪(H)','常规谱图',150.00,1,'MXH01','/','SEMXRD'),
	 ('高灵敏度X射线衍射仪(H)','掠入射物相',10.00,1,'MXH02','/','SEMXRD'),
	 ('高灵敏度X射线衍射仪(H)','结晶度分析（石墨化度）',400.00,1,'MXH03','/','SEMXRD'),
	 ('高灵敏度X射线衍射仪(H)','残余奥氏体分析',500.00,1,'MXH04','/','SEMXRD'),
	 ('高灵敏度X射线衍射仪(H)','位错密度计算',800.00,1,'MXH05','/','SEMXRD'),
	 ('高灵敏度X射线衍射仪(H)','晶格常数',500.00,1,'MXH06','/','SEMXRD'),
	 ('高灵敏度X射线衍射仪(H)','原位变温XRD',600.00,1,'MXH07','/','SEMXRD'),
	 ('高灵敏度X射线衍射仪(H)','其他',0.00,1,'MXH08','/','SEMXRD'),
	 ('大功率X射线应力分析仪(G)','多晶残余应力测试',600.00,1,'MXG01','/','SEMXRD'),
	 ('大功率X射线应力分析仪(G)','单晶残余应力测试',3000.00,1,'MXG02','/','SEMXRD');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('大功率X射线应力分析仪(G)','应力云图测试',0.00,1,'MXG03','/','SEMXRD'),
	 ('便携式残余应力仪(P)','现场残余应力测试',0.00,1,'MXP01','/','SEMXRD'),
	 ('便携式残余应力仪(P)','多晶残余应力测试',600.00,1,'MXP02','/','SEMXRD'),
	 ('便携式残余应力仪(P)','残余奥氏体测试',500.00,1,'MXP03','/','SEMXRD'),
	 ('盲孔法应力仪(B)','盲孔法残余应力-电动钻头',800.00,1,'MXB01','/','SEMXRD'),
	 ('盲孔法应力仪(B)','盲孔法残余应力-高速气动钻头',1000.00,1,'MXB02','/','SEMXRD'),
	 ('光学显微镜（M）','光镜（基恩士/蔡司）',15.00,1,'MOM01','/','SP'),
	 ('光学显微镜（M）','切片截面-定点',0.00,1,'MOM02','/','SP'),
	 ('单项制样 (S)','其他',0.00,1,'MPS06','/','SP'),
	 ('金属焊接强度（T）','金属板材拉伸强度/模量/延伸率/泊松比-应变片(-60℃~-41℃)',900.00,3,'LMT13','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('金属焊接强度（T）','金属板材拉伸强度/模量/延伸率/泊松比-应变片、引伸计(-40℃~10℃)',600.00,3,'LMT14','/','mechanics'),
	 ('金属焊接强度（T）','金属板材拉伸强度/模量/延伸率/泊松比-2D-DIC(-40℃~10℃)',900.00,3,'LMT15','/','mechanics'),
	 ('金属焊接强度（T）','金属''拉伸板材强度/模量/延伸率/泊松比(50℃~150℃)',400.00,3,'LMT26','/','mechanics'),
	 ('金属焊接强度（T）','金属拉伸板材强度/模量/延伸率/泊松比(151℃~300℃)',500.00,3,'LMT27','/','mechanics'),
	 ('金属焊接强度（T）','金属板材拉伸强度/模量/延伸率/泊松比-2D-DIC(50℃~150℃)',700.00,3,'LMT28','/','mechanics'),
	 ('金属焊接强度（T）','金属板材拉伸强度/模量/延伸率/泊松比-2D-DIC(151℃~300℃)',800.00,3,'LMT29','/','mechanics'),
	 ('金属焊接强度（T）','金属板材拉伸强度/模量/延伸率/泊松比-2D-DIC(301℃~600℃)',900.00,3,'LMT30','/','mechanics'),
	 ('金属焊接强度（T）','金属板材拉伸强度/模量/延伸率/泊松比-2D-DIC(601℃~900℃)',1200.00,3,'LMT31','/','mechanics'),
	 ('金属焊接强度（T）','金属板材拉伸强度/模量/延伸率/泊松比-2D-DIC(901℃~1100℃)',1600.00,3,'LMT32','/','mechanics'),
	 ('金属焊接强度（T）','金属棒材拉伸强度/模量/延伸率/泊松比-3D-DIC(50℃~150℃)',800.00,3,'LMT33','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('金属焊接强度（T）','金属棒材拉伸强度/模量/延伸率/泊松比-3D-DIC(151℃~300℃)',900.00,3,'LMT34','/','mechanics'),
	 ('金属压缩（C）','金属抗压强度/屈服/模量-视频引伸计(室温)',300.00,3,'LMC01','/','mechanics'),
	 ('金属压缩（C）','抗压强度/屈服/模量-2D-DIC(室温)',600.00,3,'LMC02','/','mechanics'),
	 ('金属压缩（C）','抗压强度/屈服/模量-3D-DIC(室温)',700.00,3,'LMC03','/','mechanics'),
	 ('金属压缩（C）','其他',0.00,3,'LMC04','/',''),
	 ('金属压缩（C）','金属抗压强度/屈服/模量-应变片(-60℃~-41℃)',900.00,3,'LMC11','/','mechanics'),
	 ('金属压缩（C）','金属抗压强度/屈服/模量-视频引伸计(-40℃~-10℃)',600.00,3,'LMC12','/','mechanics'),
	 ('金属压缩（C）','金属抗压强度/屈服/模量-2D-DIC(-40℃~-10℃)',1000.00,3,'LMC13','/','mechanics'),
	 ('金属压缩（C）','金属圆柱抗压强度/屈服/模量/泊松比-3D-DIC(-40℃~-10℃)',1100.00,3,'LMC14','/','mechanics'),
	 ('金属压缩（C）','金属抗压强度/屈服/模量-视频引伸计(50℃~150℃)',400.00,3,'LMC21','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('金属压缩（C）','金属抗压强度/屈服/模量-视频引伸计(151℃~300℃)',500.00,3,'LMC22','/','mechanics'),
	 ('金属压缩（C）','金属抗压强度/屈服/模量-位移拟合(301℃~600℃)',500.00,3,'LMC23','/','mechanics'),
	 ('金属压缩（C）','金属抗压强度/屈服/模量-位移拟合(601℃~900℃)',800.00,3,'LMC24','/','mechanics'),
	 ('金属压缩（C）','金属抗压强度/屈服/模量-位移拟合(901℃~1100℃)',1200.00,3,'LMC25','/','mechanics'),
	 ('金属三点弯曲（F）','金属弯曲强度/模量-2D-DIC(室温)',500.00,3,'LMF02','/','mechanics'),
	 ('金属三点弯曲（F）','其他',0.00,3,'LMF04','/','mechanics'),
	 ('金属三点弯曲（F）','金属弯曲强度/模量(-60℃~-41℃)',800.00,3,'LMF11','/','mechanics'),
	 ('金属三点弯曲（F）','金属弯曲强度/模量(-40℃~10℃)',500.00,3,'LMF12','/','mechanics'),
	 ('金属三点弯曲（F）','金属弯折弯角度(-60℃~-41℃)',900.00,3,'LMF13','/','mechanics'),
	 ('金属三点弯曲（F）','金属弯折弯角度(-40℃~10℃)',600.00,3,'LMF14','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('金属三点弯曲（F）','金属弯曲强度/模量(50℃~150℃)',300.00,3,'LMF21','/','mechanics'),
	 ('金属三点弯曲（F）','金属弯曲强度/模量(151℃~300℃)',400.00,3,'LMF22','/','mechanics'),
	 ('金属三点弯曲（F）','金属弯曲强度/模量(301℃~600℃)',500.00,3,'LMF23','/','mechanics'),
	 ('金属三点弯曲（F）','金属弯曲强度/模量(601℃~900℃)',800.00,3,'LMF24','/','mechanics'),
	 ('金属三点弯曲（F）','金属弯曲强度/模量(901℃~1100℃)',1200.00,3,'LMF25','/','mechanics'),
	 ('金属三点弯曲（F）','金属弯折角度(50℃~150℃)',400.00,3,'LMF26','/','mechanics'),
	 ('金属三点弯曲（F）','金属弯折角度(151℃~300℃)',500.00,3,'LMF27','/','mechanics'),
	 ('金属剪切（S）','金属拉伸剪切强度(室温)',200.00,3,'LMS01','/','mechanics'),
	 ('金属剪切（S）','压缩剪切强度(室温)',300.00,3,'LMS03','/','mechanics'),
	 ('金属剪切（S）','其他',0.00,3,'LMS04','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('金属剪切（S）','金属拉伸剪切强度(-60℃~-41℃)',800.00,3,'LMS11','/','mechanics'),
	 ('金属剪切（S）','金属拉伸剪切强度(-40℃~-10℃)',500.00,3,'LMS12','/','mechanics'),
	 ('金属剪切（S）','金属压缩剪切强度(-60℃~-41℃)',900.00,3,'LMS13','/','mechanics'),
	 ('金属剪切（S）','金属压缩剪切强度(-40℃~-10℃)',600.00,3,'LMS14','/','mechanics'),
	 ('金属剪切（S）','金属销剪切强度(-60℃~-41℃)',900.00,3,'LMS15','/','mechanics'),
	 ('金属剪切（S）','金属销剪切强度(-40℃~-10℃)',600.00,3,'LMS16','/','mechanics'),
	 ('金属剪切（S）','金属拉伸剪切强度(50℃~150℃)',300.00,3,'LMS21','/','mechanics'),
	 ('金属剪切（S）','金属拉伸剪切强度(151℃~300℃)',400.00,3,'LMS22','/','mechanics'),
	 ('金属剪切（S）','金属拉伸剪切强度(301℃~600℃)',500.00,3,'LMS23','/','mechanics'),
	 ('金属剪切（S）','金属拉伸剪切强度(601℃~900℃)',800.00,3,'LMS24','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('金属剪切（S）','金属拉伸剪切强度(901℃~1100℃)',1200.00,3,'LMS25','/','mechanics'),
	 ('金属剪切（S）','金属压缩剪切强度(50℃~150℃)',400.00,3,'LMS26','/','mechanics'),
	 ('金属剪切（S）','金属压缩剪切强度(151℃~300℃)',500.00,3,'LMS27','/','mechanics'),
	 ('金属剪切（S）','金属压缩剪切强度(301℃~600℃)',600.00,3,'LMS28','/','mechanics'),
	 ('金属剪切（S）','金属压缩剪切强度(601℃~900℃)',900.00,3,'LMS29','/','mechanics'),
	 ('金属剪切（S）','金属压缩剪切强度(901℃~1100℃)',1300.00,3,'LMS30','/','mechanics'),
	 ('金属剪切（S）','金属销剪切强度(301℃~600℃)',600.00,3,'LMS33','/','mechanics'),
	 ('金属剪切（S）','金属销剪切强度(601℃~900℃)',900.00,3,'LMS34','/','mechanics'),
	 ('金属剪切（S）','金属销剪切强度(901℃~1100℃)',1300.00,3,'LMS35','/','mechanics'),
	 ('金属焊接强度（T）','其他',0.00,3,'LMT53','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('金属持久（R）','其他',0.00,3,'LRR02','/','mechanics'),
	 ('金属蠕变（C）','其他',0.00,3,'LRC02','/','mechanics'),
	 ('应变控制疲劳LCF（S）','其他',0.00,3,'LFS06','/','mechanics'),
	 ('金属断裂韧性K1C（F）','其他',0.00,3,'LFF06','/','mechanics'),
	 ('材料卡片开发测试(E)','准静态拉伸＜100mm/min-引伸计(室温)',300.00,3,'LTE01','/','mechanics'),
	 ('材料卡片开发测试(E)','准静态拉伸＜100mm/min-DIC(室温)',600.00,3,'LTE02','/','mechanics'),
	 ('材料卡片开发测试(E)','准静态缺口拉伸-引伸计(室温)',300.00,3,'LTE03','/','mechanics'),
	 ('材料卡片开发测试(E)','准静态缺口拉伸-DIC(室温)',600.00,3,'LTE04','/','mechanics'),
	 ('材料卡片开发测试(E)','准静态三点弯-DIC(室温)',600.00,3,'LTE05','/','mechanics'),
	 ('材料卡片开发测试(E)','准静态穿孔-DIC(室温)',600.00,3,'LTE06','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('材料卡片开发测试(E)','准静态压缩-DIC(室温)',600.00,3,'LTE07','/','mechanics'),
	 ('材料卡片开发测试(E)','准静态剪切-DIC(室温)',600.00,3,'LTE08','/','mechanics'),
	 ('材料卡片开发测试(E)','其他',0.00,3,'LTE09','/','mechanics'),
	 ('材料卡片开发测试(E)','动态拉伸≥0.1/s(室温)',1000.00,3,'LTE21','/','mechanics'),
	 ('材料卡片开发测试(E)','动态缺口拉伸≥0.1/s(室温)',1000.00,3,'LTE22','/','mechanics'),
	 ('材料卡片开发测试(E)','薄膜动态拉伸(室温)',1300.00,3,'LTE23','/','mechanics'),
	 ('材料卡片开发测试(E)','动态压缩-无夹具(室温)',1000.00,3,'LTE24','/','mechanics'),
	 ('材料卡片开发测试(E)','动态三点弯(室温)',1000.00,3,'LTE25','/','mechanics'),
	 ('材料卡片开发测试(E)','动态穿孔-落锤(室温)',400.00,3,'LTE26','/','mechanics'),
	 ('材料卡片开发测试(E)','其他',0.00,3,'LTE27','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('高速拉伸（T）','其他',0.00,3,'LDT05','/','mechanics'),
	 ('落锤冲击（D）','简支梁冲击(室温)',200.00,3,'LDD02','/','mechanics'),
	 ('落锤冲击（D）','悬臂梁冲击(室温)',200.00,3,'LDD03','/','mechanics'),
	 ('落锤冲击（D）','简支梁冲击(-60℃~-40℃)',450.00,3,'LDD05','/','mechanics'),
	 ('落锤冲击（D）','悬臂梁冲击(-60℃~-40℃)',450.00,3,'LDD06','/','mechanics'),
	 ('落锤冲击（D）','简支梁冲击(-40℃~10℃)',350.00,3,'LDD08','/','mechanics'),
	 ('落锤冲击（D）','悬臂梁冲击(-40℃~10℃)',350.00,3,'LDD09','/','mechanics'),
	 ('落锤冲击（D）','简支梁冲击(50℃~150℃)',300.00,3,'LDD11','/','mechanics'),
	 ('落锤冲击（D）','悬臂梁冲击(50℃~150℃)',300.00,3,'LDD12','/','mechanics'),
	 ('落锤冲击（D）','非标零件冲击',0.00,3,'LDD13','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('塑料拉伸（T）','软塑料/橡胶拉伸强度/模量-引伸计(室温)',300.00,3,'LST04','/','mechanics'),
	 ('塑料拉伸（T）','软塑料/橡胶拉伸强度/模量-2D-DIC(室温)',600.00,3,'LST05','/','mechanics'),
	 ('塑料拉伸（T）','薄膜拉伸强度/模量/泊松比-2D-DIC(室温)',600.00,3,'LST07','/','mechanics'),
	 ('塑料拉伸（T）','其他',0.00,3,'LST08','/','mechanics'),
	 ('塑料拉伸（T）','塑料拉伸(-80℃~-61℃)',600.00,3,'LST11','/','mechanics'),
	 ('塑料拉伸（T）','塑料拉伸(-60℃~-41℃)',500.00,3,'LST12','/','mechanics'),
	 ('塑料拉伸（T）','塑料拉伸(-40℃~10℃)',400.00,3,'LST13','/','mechanics'),
	 ('塑料拉伸（T）','塑料拉伸-2D-DIC(-40℃~10℃)',800.00,3,'LST14','/','mechanics'),
	 ('塑料拉伸（T）','塑料拉伸(50℃~100℃)',300.00,3,'LST21','/','mechanics'),
	 ('塑料拉伸（T）','塑料拉伸-2D-DIC(50℃~100℃)',600.00,3,'LST22','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('塑料拉伸（T）','塑料拉伸(101℃~250℃)',400.00,3,'LST23','/','mechanics'),
	 ('塑料拉伸（T）','塑料拉伸-2D-DIC(101℃~250℃)',700.00,3,'LST24','/','mechanics'),
	 ('塑料拉伸（T）','塑料拉伸(251℃~300℃)',500.00,3,'LST25','/','mechanics'),
	 ('塑料拉伸（T）','塑料拉伸-2D-DIC(251℃~300℃)',800.00,3,'LST26','/','mechanics'),
	 ('陶瓷材料压缩（C）','其他',0.00,3,'LSC04','/','mechanics'),
	 ('陶瓷材料压缩（C）','塑料压缩(-80℃~-61℃)',600.00,3,'LSC11','/','mechanics'),
	 ('陶瓷材料压缩（C）','塑料压缩(-60℃~-41℃)',550.00,3,'LSC12','/','mechanics'),
	 ('陶瓷材料压缩（C）','塑料压缩(-40℃~10℃)',500.00,3,'LSC13','/','mechanics'),
	 ('陶瓷材料压缩（C）','塑料压缩-2D-DIC(-40℃~10℃)',900.00,3,'LSC14','/','mechanics'),
	 ('陶瓷材料压缩（C）','塑料压缩(50℃~100℃)',300.00,3,'LSC21','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('陶瓷材料压缩（C）','塑料压缩-2D-DIC(50℃~100℃)',600.00,3,'LSC22','/','mechanics'),
	 ('陶瓷材料压缩（C）','塑料压缩强度(101℃~250℃)',400.00,3,'LSC23','/','mechanics'),
	 ('陶瓷材料压缩（C）','塑料压缩-2D-DIC(101℃~250℃)',700.00,3,'LSC24','/','mechanics'),
	 ('陶瓷材料压缩（C）','塑料压缩强度(251℃~300℃)',500.00,3,'LSC25','/','mechanics'),
	 ('陶瓷材料压缩（C）','塑料压缩-2D-DIC(251℃~300℃)',800.00,3,'LSC26','/','mechanics'),
	 ('塑料弯曲（F）','塑料弯曲-2D-DIC(室温)',500.00,3,'LSF02','/','mechanics'),
	 ('塑料弯曲（F）','其他',0.00,3,'LSF03','/','mechanics'),
	 ('塑料弯曲（F）','塑料弯曲(-40℃~10℃)',310.00,3,'LSF11','/','mechanics'),
	 ('塑料弯曲（F）','塑料弯曲-2D-DIC(-40℃~10℃)',700.00,3,'LSF12','/','mechanics'),
	 ('塑料弯曲（F）','塑料弯曲(50℃~100℃)',200.00,3,'LSF21','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('塑料弯曲（F）','塑料弯曲-2D-DIC(50℃~100℃)',500.00,3,'LSF22','/','mechanics'),
	 ('塑料弯曲（F）','塑料弯曲(101℃~250℃)',250.00,3,'LSF23','/','mechanics'),
	 ('塑料弯曲（F）','塑料弯曲-2D-DIC(101℃~250℃)',550.00,3,'LSF24','/','mechanics'),
	 ('塑料剪切（S）','塑料剪切强度/模量(室温)',300.00,3,'LSS02','/','mechanics'),
	 ('塑料剪切（S）','塑料剪切-2D-DIC(室温)',600.00,3,'LSS03','/','mechanics'),
	 ('塑料剪切（S）','其他',0.00,3,'LSS04','/','mechanics'),
	 ('塑料剪切（S）','塑料剪切(-40℃~10℃)',600.00,3,'LSS11','/','mechanics'),
	 ('塑料剪切（S）','塑料剪切-2D-DIC(-40℃~10℃)',1000.00,3,'LSS12','/','mechanics'),
	 ('塑料剪切（S）','塑料剪切(50℃~100℃)',400.00,3,'LSS21','/','mechanics'),
	 ('塑料剪切（S）','塑料剪切-2D-DIC(50℃~100℃)',700.00,3,'LSS22','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('塑料剪切（S）','塑料剪切(101℃~250℃)',550.00,3,'LSS23','/','mechanics'),
	 ('塑料剪切（S）','塑料剪切-2D-DIC(101℃~250℃)',800.00,3,'LSS24','/','mechanics'),
	 ('高分子蠕变(S)','其他',0.00,3,'LRS06','/','mechanics'),
	 ('塑料拉伸（T）','其他',0.00,3,'LST43','/','mechanics'),
	 ('陶瓷材料压缩（C）','其他',0.00,3,'LSC43','/','mechanics'),
	 ('陶瓷材料弯曲（F）','其他',0.00,3,'LSF42','/','mechanics'),
	 ('陶瓷材料断裂韧性（F）','陶瓷断裂韧性压痕法(室温)',1000.00,3,'LSF52','/','mechanics'),
	 ('复材拉伸（T）','复材拉伸强度/模量/泊松比(室温)',250.00,3,'LPT03','/','mechanics'),
	 ('复材拉伸（T）','复材拉伸-2D-DIC(室温)',500.00,3,'LPT04','/','mechanics'),
	 ('复材拉伸（T）','其他',0.00,3,'LPT05','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('复材拉伸（T）','复材拉伸强度/模量/泊松比(50℃~100℃)',350.00,3,'LPT24','/','mechanics'),
	 ('复材拉伸（T）','复材拉伸强度/模量/泊松比(101℃~250℃)',450.00,3,'LPT25','/','mechanics'),
	 ('复材拉伸（T）','复材拉伸强度/模量/泊松比(251℃~350℃)',550.00,3,'LPT26','/','mechanics'),
	 ('复材压缩（C）','复材压缩强度/模量/泊松比(室温)',320.00,3,'LPC03','/','mechanics'),
	 ('复材压缩（C）','其他',0.00,3,'LPC04','/','mechanics'),
	 ('复材压缩（C）','复材压缩强度/模量/泊松比(-60℃~-41℃)',650.00,3,'LPC13','/','mechanics'),
	 ('复材压缩（C）','复材压缩强度/模量/泊松比(-40℃~10℃)',600.00,3,'LPC14','/','mechanics'),
	 ('复材压缩（C）','复材压缩-2D-DIC(-40℃~10℃)',900.00,3,'LPC15','/','mechanics'),
	 ('复材压缩（C）','复材压缩-2D-DIC(50℃~120℃)',600.00,3,'LPC22','/','mechanics'),
	 ('复材压缩（C）','复材压缩强度/模量-高温应变片(121℃~250℃)',500.00,3,'LPC24','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('复材压缩（C）','复材压缩-2D-DIC(121℃~250℃)',700.00,3,'LPC25','/','mechanics'),
	 ('复材压缩（C）','复材压缩-2D-DIC(251℃~350℃)',800.00,3,'LPC27','/','mechanics'),
	 ('复材三点弯曲（F）','其他',0.00,3,'LPF03','/','mechanics'),
	 ('复材四点弯曲(F)','复材四点弯曲强度/模量(室温)',350.00,3,'LPF04','/','mechanics'),
	 ('复材四点弯曲(F)','其他',0.00,3,'LPF05','/','mechanics'),
	 ('复材四点弯曲(F)','复材四点弯曲强度/模量(-60℃~-41℃)',550.00,3,'LPF13','/','mechanics'),
	 ('复材四点弯曲(F)','复材四点弯曲强度/模量(-40℃~10℃)',500.00,3,'LPF14','/','mechanics'),
	 ('复材四点弯曲(F)','复材四点弯曲强度/模量(50℃~100℃)',400.00,3,'LPF24','/','mechanics'),
	 ('复材四点弯曲(F)','复材四点弯曲强度/模量(101℃~250℃)',500.00,3,'LPF25','/','mechanics'),
	 ('双梁剪切（F）','其他',0.00,3,'LPF07','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('面内剪切（S）','其他',0.00,3,'LPS03','/','mechanics'),
	 ('V型剪切（S）','其他',0.00,3,'LPS33','/','mechanics'),
	 ('V型剪切（S）','V形剪切-2D-DIC(-40℃~10℃)',1000.00,3,'LPS43','/','mechanics'),
	 ('V型剪切（S）','V形剪切-2D-DIC(50℃~120℃)',700.00,3,'LPS52','/','mechanics'),
	 ('V型剪切（S）','V形剪切''强度/模量-高温应变片(121℃~250℃)',550.00,3,'LPS53','/','mechanics'),
	 ('V型剪切（S）','V形剪切强度(251℃~350℃)',500.00,3,'LPS55','/','mechanics'),
	 ('短梁/层间剪切（S）','其他',0.00,3,'LPS62','/','mechanics'),
	 ('开孔拉伸/填孔拉伸（T）','其他',0.00,3,'LPT07','/','mechanics'),
	 ('开孔压缩/填孔压缩（C）','其他',0.00,3,'LPC32','/','mechanics'),
	 ('螺栓挤压（T）','其他',0.00,3,'LPT32','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('冲击后压缩（A）','冲击+无损+压缩贴片(50℃~120℃)',1200.00,3,'LPA06','/','mechanics'),
	 ('冲击后压缩（A）','其他',0.00,3,'LPA07','/','mechanics'),
	 ('层间断裂韧性（F）','其他',0.00,3,'LPF34','/','mechanics'),
	 ('管拉伸(T)','管轴向拉伸强度/模量(室温)',2000.00,3,'LPT33','/','mechanics'),
	 ('管拉伸(T)','其他',0.00,3,'LPT34','/','mechanics'),
	 ('管拉伸(T)','管轴向拉伸强度/模量(50℃~100℃)',4000.00,3,'LPT54','/','mechanics'),
	 ('管拉伸(T)','管轴向拉伸强度/模量(101℃~250℃)',5000.00,3,'LPT55','/','mechanics'),
	 ('管拉伸(T)','管表观环向拉伸强度/模量(室温)',2000.00,3,'LPT35','/','mechanics'),
	 ('管拉伸(T)','管表观环向拉伸强度/模量(50℃~100℃)',4000.00,3,'LPT56','/','mechanics'),
	 ('管拉伸(T)','表观环向拉伸强度(101℃~250℃)',5000.00,3,'LPT57','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('管刚度(C)','管刚度因子(室温)',1500.00,3,'LPC33','/','mechanics'),
	 ('管刚度(C)','其他',0.00,3,'LPC34','/','mechanics'),
	 ('管刚度(C)','管刚度因子(50℃~100℃)',2000.00,3,'LPC54','/','mechanics'),
	 ('管刚度(C)','管刚度因子(101℃~250℃)',2500.00,3,'LPC55','/','mechanics'),
	 ('疲劳(P)','复材拉-拉疲劳(室温)',300.00,3,'LFP01','/','mechanics'),
	 ('疲劳(P)','复材压-压疲劳-无夹具(室温)',300.00,3,'LFP02','/','mechanics'),
	 ('疲劳(P)','复材拉-压疲劳-无夹具(室温)',300.00,3,'LFP03','/','mechanics'),
	 ('疲劳(P)','复材拉-压疲劳-带夹具(室温)',400.00,3,'LFP04','/','mechanics'),
	 ('疲劳(P)','复材开孔压-压疲劳(室温)',400.00,3,'LFP05','/','mechanics'),
	 ('疲劳(P)','复材连接挤压疲劳(室温)',400.00,3,'LFP06','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('疲劳(P)','复材冲击后拉-压疲劳(室温)',500.00,3,'LFP07','/','mechanics'),
	 ('疲劳(P)','复材冲击后压-压疲劳(室温)',500.00,3,'LFP08','/','mechanics'),
	 ('疲劳(P)','其他',0.00,3,'LFP09','/','mechanics'),
	 ('单搭接/双搭接（T）','单搭接强度-2D-DIC(室温)',500.00,3,'LPT62','/','mechanics'),
	 ('单搭接/双搭接（T）','其他',0.00,3,'LPT63','/','mechanics'),
	 ('单搭接/双搭接（T）','双搭接强度(室温)',200.00,3,'LPT64','/','mechanics'),
	 ('单搭接/双搭接（T）','双搭接强度-2D-DIC(室温)',500.00,3,'LPT65','/','mechanics'),
	 ('单搭接/双搭接（T）','其他',0.00,3,'LPT66','/','mechanics'),
	 ('单搭接/双搭接（T）','双搭接强度(-60℃~-41℃)',450.00,3,'LPT73','/','mechanics'),
	 ('单搭接/双搭接（T）','双搭接强度(-40℃~10℃)',400.00,3,'LPT74','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('单搭接/双搭接（T）','双搭接强度(50℃~100℃)',250.00,3,'LPT84','/','mechanics'),
	 ('单搭接/双搭接（T）','双搭接强度(101℃~250℃)',350.00,3,'LPT85','/','mechanics'),
	 ('单搭接/双搭接（T）','双搭接强度(251℃~350℃)',450.00,3,'LPT86','/','mechanics'),
	 ('平面拉伸（T）','其他',0.00,3,'LPT92','/','mechanics'),
	 ('剥离强度（P）','90°/浮辊剥离(室温）',250.00,3,'LPP02','/','mechanics'),
	 ('剥离强度（P）','180°剥离(室温)',200.00,3,'LPP03','/','mechanics'),
	 ('剥离强度（P）','T剥离(室温)',200.00,3,'LPP04','/','mechanics'),
	 ('剥离强度（P）','其他',0.00,3,'LPP05','/','mechanics'),
	 ('夹层结构压缩（C）','其他',0.00,3,'LPC63','/','mechanics'),
	 ('夹层芯材拉伸剪切（T）','夹层芯材拉伸剪切强度/模量/挠度-室温(含面板粘贴)',400.00,3,'LPT94','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('夹层芯材拉伸剪切（T）','其他',0.00,3,'LPT95','/','mechanics'),
	 ('状态调节(A)','状态调节-吸湿箱(-40℃~10℃)',40.00,3,'LRA05','/','mechanics'),
	 ('压痕硬度(纳米硬度)（H）','纳米压痕-断裂韧性',600.00,3,'LHH06','/','mechanics'),
	 ('压痕硬度(纳米硬度)（H）','划痕测试',500.00,3,'LHH07','/','mechanics'),
	 ('高温压缩（C）','其他',0.00,3,'LHC06','/','mechanics'),
	 ('高温拉伸（T）','其他',0.00,3,'LHT05','/','mechanics'),
	 ('热处理（P）','其他',0.00,3,'LHP05','/','mechanics'),
	 ('其他热模拟（F）','热机械疲劳(循环次数：＞100次)',0.00,3,'LHF05','/','mechanics'),
	 ('显微，物化测试样','/',80.00,3,'LXM07','/','machining'),
	 ('板材疲劳','板材',100.00,3,'LXM14',NULL,'machining');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('试样改样','棒材、板材',50.00,3,'LXM18',NULL,'machining'),
	 ('机加工-其他','其他',0.00,3,'LXX01',NULL,'machining'),
	 ('其他类别(OC)','其他',0.00,2,'COC01',NULL,NULL),
	 ('其他类别(OC)','其他',0.00,1,'MOC01',NULL,NULL),
	 ('机加工-金属试样','',60.00,3,'LXM00',NULL,'mechanics'),
	 ('机加工-非金属试样','',60.00,3,'LXP00',NULL,'machining'),
	 ('机加工-工装加工','',400.00,3,'LXX00',NULL,'machining'),
	 ('机加工-其他','',0.00,3,'LXX01',NULL,'machining'),
	 ('火花放电直读光谱仪(s)','块状金属牌号分析',1000.00,2,'CPS06',NULL,'ComponentAnalysis'),
	 ('高灵敏度X射线衍射仪(H)','常规谱图+物相鉴定',350.00,1,'MXH09',NULL,'SEMXRD');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('高灵敏度X射线衍射仪(H)','常规谱图+物相鉴定+定量',650.00,1,'MXH10',NULL,'SEMXRD'),
	 ('无机C、S、O、N、H分析仪(A)','元素含量分析(备注需要分析的元素)',200.00,2,'CPA01',NULL,'ChemicalAnalysis'),
	 ('有机C、S、O、N、H分析仪(A)','元素含量分析(备注需要分析的元素)',200.00,2,'CPA02',NULL,'ChemicalAnalysis'),
	 ('应力控制疲劳SCF（L）','其他',0.00,3,'LFL06','/','mechanics'),
	 ('金属拉伸','其他',0.00,3,'LMT10','/','mechanics'),
	 ('高速压缩(C)','其他',0.00,3,'LDCO5','/','mechanics'),
	 ('CNAS','CNAS报告（NS）',500.00,3,'LNS01','/',NULL),
	 ('CNAS','CNAS报告（NS）',500.00,2,'CNS01','/',NULL),
	 ('CNAS','CNAS报告（NS）',500.00,1,'MNS01','/',NULL),
	 ('其他类别（OC）','其他',0.00,3,'LOC01','/','mechanics');
INSERT INTO jitri.price (test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id) VALUES
	 ('压痕硬度(纳米硬度)(H)','镶嵌制样(纳米压痕)',100.00,3,'LHH09','/','mechanics'),
	 ('布洛维硬度(H)','制样(布洛维硬度)',100.00,3,'LHH10','/','mechanics');
