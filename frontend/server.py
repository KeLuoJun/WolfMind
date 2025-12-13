#!/usr/bin/env python3
"""
简单的HTTP服务器，用于提供狼人杀游戏日志查看功能
"""
import os
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime

class LogServerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # 获取当前脚本所在目录
        current_dir = os.path.dirname(os.path.abspath(__file__))
        super().__init__(*args, directory=current_dir, **kwargs)
    
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        # API: 获取日志文件列表
        if parsed_path.path == '/api/logs':
            self.send_json_response(self.get_log_files())
            return
        
        # API: 获取特定日志文件内容
        if parsed_path.path.startswith('/api/logs/'):
            filename = parsed_path.path.split('/api/logs/')[1]
            self.send_log_content(filename)
            return
        
        # API: 获取玩家经验文件
        if parsed_path.path.startswith('/api/experiences/'):
            # 格式: /api/experiences/{date_suffix}/{player_name}
            parts = parsed_path.path.split('/api/experiences/')[1].split('/')
            if len(parts) >= 2:
                date_suffix = parts[0]
                player_name = parts[1]
                self.send_experience_content(date_suffix, player_name)
            else:
                self.send_error(400, 'Invalid request format')
            return
        
        # 默认处理静态文件
        super().do_GET()
    
    def log_message(self, format, *args):
        """覆盖默认日志方法以打印详细信息"""
        print(f"[{self.log_date_time_string()}] {format % args}")

    def get_log_files(self):
        """获取所有日志文件列表"""
        # 从frontend目录向上一级，然后进入backend/data/game_logs
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(current_dir)
        log_dir = os.path.join(project_root, 'backend', 'data', 'game_logs')
        
        # print(f"Looking for logs in: {log_dir}") # Debug log
        
        if not os.path.exists(log_dir):
            print(f"Warning: Log directory does not exist: {log_dir}")
            return []
        
        files = []
        for filename in os.listdir(log_dir):
            if filename.endswith('.log'):
                filepath = os.path.join(log_dir, filename)
                mtime = os.path.getmtime(filepath)
                files.append({
                    'name': filename,
                    'time': datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M:%S'),
                    'timestamp': mtime
                })
        
        # 按时间倒序排序（最新的在前）
        files.sort(key=lambda x: x['timestamp'], reverse=True)
        return files
    
    def send_log_content(self, filename):
        """发送日志文件内容"""
        # 从frontend目录向上一级，然后进入backend/data/game_logs
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(current_dir)
        log_path = os.path.join(project_root, 'backend', 'data', 'game_logs', filename)
        
        if not os.path.exists(log_path):
            self.send_error(404, 'Log file not found')
            return
        
        try:
            with open(log_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-type', 'text/plain; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except Exception as e:
            self.send_error(500, f'Error reading log file: {str(e)}')
    
    def send_experience_content(self, date_suffix, player_name):
        """发送玩家经验文件内容"""
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(current_dir)
        exp_dir = os.path.join(project_root, 'backend', 'data', 'experiences')
        
        # 查找匹配日期的经验文件
        if not os.path.exists(exp_dir):
            self.send_json_response({'error': 'Experiences directory not found', 'content': ''})
            return
        
        # 经验文件名格式: experiences_{date}.json 或类似
        found_file = None
        for filename in os.listdir(exp_dir):
            if date_suffix in filename and filename.endswith('.json'):
                found_file = os.path.join(exp_dir, filename)
                break
        
        if not found_file:
            self.send_json_response({'error': 'Experience file not found', 'content': '', 'player': player_name})
            return
        
        try:
            with open(found_file, 'r', encoding='utf-8') as f:
                all_experiences = json.load(f)
            
            # 提取特定玩家的经验
            player_exp = all_experiences.get(player_name, {})
            self.send_json_response({
                'player': player_name,
                'experiences': player_exp,
                'file': os.path.basename(found_file)
            })
        except Exception as e:
            self.send_json_response({'error': str(e), 'content': '', 'player': player_name})
    
    def send_json_response(self, data):
        """发送JSON响应"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f"[{self.log_date_time_string()}] {format % args}")

def run_server(port=8080):
    """运行服务器"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, LogServerHandler)
    print(f"🚀 狼人杀日志查看器服务器启动成功！")
    print(f"📍 访问地址: http://localhost:{port}")
    print(f"📂 日志目录: backend/data/game_logs")
    print(f"⏹️  按 Ctrl+C 停止服务器\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n👋 服务器已停止")
        httpd.shutdown()

if __name__ == '__main__':
    run_server()
