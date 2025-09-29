#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成开单v2.0 price表数据导入脚本
基于旧数据库jitri.price表数据生成
"""

import re

def parse_old_sql():
    """解析旧的SQL文件"""
    with open('price导入.sql', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 提取所有INSERT语句中的数据
    pattern = r"INSERT INTO jitri\.price \(test_item_name,test_condition,unit_price,department_id,test_code,test_standard,group_id\) VALUES\s*(.*?);"
    matches = re.findall(pattern, content, re.DOTALL)
    
    all_data = []
    for match in matches:
        # 解析VALUES部分
        lines = match.strip().split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith("(") and line.endswith("),"):
                line = line[:-1]  # 移除最后的逗号
            elif line.startswith("(") and line.endswith(")"):
                pass  # 保持原样
            
            if line.startswith("(") and line.endswith(")"):
                # 解析单行数据
                data = line[1:-1]  # 移除括号
                # 分割字段，处理引号内的逗号
                fields = []
                current_field = ""
                in_quotes = False
                quote_char = None
                
                for char in data:
                    if char in ['"', "'"] and not in_quotes:
                        in_quotes = True
                        quote_char = char
                        current_field += char
                    elif char == quote_char and in_quotes:
                        in_quotes = False
                        quote_char = None
                        current_field += char
                    elif char == ',' and not in_quotes:
                        fields.append(current_field.strip())
                        current_field = ""
                    else:
                        current_field += char
                
                if current_field.strip():
                    fields.append(current_field.strip())
                
                if len(fields) >= 7:
                    all_data.append(fields)
    
    return all_data

def generate_new_sql():
    """生成新的SQL文件"""
    data = parse_old_sql()
    
    # 组名到数字ID的映射（基于lab_groups表的插入顺序）
    group_mapping = {
        'ComponentAnalysis': 1,   # 成分分析
        'Thermoanalysis': 2,      # 热分析
        'ChemicalAnalysis': 3,    # 化学分析
        'FIBTEM': 4,             # FIBTEM
        'SEMXRD': 5,             # SEMXRD
        'SP': 6,                 # SP
        'mechanics': 7,          # 力学测试
        'machining': 8,          # 机加工
    }
    
    sql_content = """-- 开单v2.0 price表数据导入脚本
-- 基于旧数据库jitri.price表数据生成
-- 新表结构：price_id, category_name, detail_name, test_code, standard_code, department_id, group_id, unit_price, is_outsourced, is_active, note, active_from, active_to, created_at, updated_at

INSERT INTO `price` (`category_name`, `detail_name`, `test_code`, `standard_code`, `department_id`, `group_id`, `unit_price`, `is_outsourced`, `is_active`, `note`) VALUES
"""
    
    for i, row in enumerate(data):
        if len(row) >= 7:
            # 旧表字段映射到新表字段
            category_name = row[0].strip("'\"")  # test_item_name -> category_name
            detail_name = row[1].strip("'\"")    # test_condition -> detail_name
            unit_price = row[2].strip("'\"")
            department_id = row[3].strip("'\"") if row[3].strip("'\"") != 'NULL' else 'NULL'
            test_code = row[4].strip("'\"")
            standard_code = row[5].strip("'\"")  # test_standard -> standard_code
            group_name = row[6].strip("'\"") if row[6].strip("'\"") != 'NULL' else 'NULL'
            
            # 处理单引号转义
            category_name = category_name.replace("'", "\\'")
            detail_name = detail_name.replace("'", "\\'")
            standard_code = standard_code.replace("'", "\\'")
            test_code = test_code.replace("'", "\\'")
            
            # 映射group_name到group_id
            group_id = group_mapping.get(group_name, 'NULL')
            
            # 设置默认值
            is_outsourced = 0  # 默认不委外
            is_active = 1      # 默认启用
            note = 'NULL'      # 默认无备注
            
            # 格式化SQL
            if i == len(data) - 1:
                sql_content += f"('{category_name}', '{detail_name}', '{test_code}', '{standard_code}', {department_id}, {group_id}, {unit_price}, {is_outsourced}, {is_active}, {note});\n"
            else:
                sql_content += f"('{category_name}', '{detail_name}', '{test_code}', '{standard_code}', {department_id}, {group_id}, {unit_price}, {is_outsourced}, {is_active}, {note}),\n"
    
    return sql_content

if __name__ == "__main__":
    try:
        sql_content = generate_new_sql()
        with open('price_v2_insert.sql', 'w', encoding='utf-8') as f:
            f.write(sql_content)
        print("成功生成 price_v2_insert.sql 文件")
        print(f"共处理了 {len(parse_old_sql())} 条记录")
    except Exception as e:
        print(f"生成文件时出错: {e}")
