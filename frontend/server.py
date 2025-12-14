#!/usr/bin/env python3
"""
简单的HTTP服务器，用于提供狼人杀游戏日志查看功能
"""
import os
import json
import subprocess
import signal
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime

# 全局变量存储游戏进程
game_process = None

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
        
        # API: 获取游戏配置
        if parsed_path.path == '/api/config':
            self.send_json_response(self.get_game_config())
            return
        
        # API: 获取游戏状态
        if parsed_path.path == '/api/game/status':
            self.send_json_response(self.get_game_status())
            return
        
        # 默认处理静态文件
        super().do_GET()
    
    def do_POST(self):
        """处理POST请求"""
        try:
            parsed_path = urlparse(self.path)
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
            
            try:
                data = json.loads(post_data) if post_data else {}
            except json.JSONDecodeError:
                data = {}
            
            # API: 保存游戏配置
            if parsed_path.path == '/api/config':
                result = self.save_game_config(data)
                self.send_json_response(result)
                return
            
            # API: 启动游戏
            if parsed_path.path == '/api/game/start':
                result = self.start_game()
                self.send_json_response(result)
                return
            
            # API: 停止游戏
            if parsed_path.path == '/api/game/stop':
                result = self.stop_game()
                self.send_json_response(result)
                return
            
            self.send_json_response({'success': False, 'message': 'API not found'})
        except Exception as e:
            print(f"POST Error: {e}")
            self.send_json_response({'success': False, 'message': str(e)})
    


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
    
    def get_game_config(self):
        """读取游戏配置"""
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(current_dir)
        env_path = os.path.join(project_root, 'backend', '.env')
        
        config = {
            'MODEL_PROVIDER': 'dashscope',
            'DASHSCOPE_API_KEY': '',
            'DASHSCOPE_MODEL_NAME': 'qwen2.5-32b-instruct',
            'OPENAI_API_KEY': '',
            'OPENAI_BASE_URL': 'https://api.openai.com/v1',
            'OPENAI_MODEL_NAME': 'gpt-3.5-turbo',
            'OLLAMA_MODEL_NAME': 'qwen2.5:1.5b',
            'MAX_GAME_ROUND': '30',
            'MAX_DISCUSSION_ROUND': '3',
            'ENABLE_STUDIO': 'false',
        }
        
        if os.path.exists(env_path):
            try:
                with open(env_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith('#'):
                            continue
                        if '=' in line:
                            key, value = line.split('=', 1)
                            key = key.strip()
                            value = value.strip()
                            if key in config:
                                config[key] = value
            except Exception as e:
                print(f"Error reading config: {e}")
        
        return config
    
    def save_game_config(self, data):
        """保存游戏配置到.env文件"""
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(current_dir)
        env_path = os.path.join(project_root, 'backend', '.env')
        
        # 读取现有配置文件内容
        lines = []
        if os.path.exists(env_path):
            with open(env_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        
        # 更新配置值
        updated_keys = set()
        new_lines = []
        for line in lines:
            stripped = line.strip()
            if stripped and not stripped.startswith('#') and '=' in stripped:
                key = stripped.split('=', 1)[0].strip()
                if key in data:
                    new_lines.append(f"{key}={data[key]}\n")
                    updated_keys.add(key)
                else:
                    new_lines.append(line)
            else:
                new_lines.append(line)
        
        # 添加新的配置项
        for key, value in data.items():
            if key not in updated_keys:
                new_lines.append(f"{key}={value}\n")
        
        try:
            with open(env_path, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            return {'success': True, 'message': '配置已保存'}
        except Exception as e:
            return {'success': False, 'message': f'保存失败: {str(e)}'}
    
    def get_game_status(self):
        """获取游戏运行状态"""
        global game_process
        if game_process is not None and game_process.poll() is None:
            return {'running': True, 'pid': game_process.pid}
        return {'running': False, 'pid': None}
    
    def start_game(self):
        """启动游戏"""
        global game_process
        
        # 检查是否已有游戏在运行
        if game_process is not None and game_process.poll() is None:
            return {'success': False, 'message': '游戏已在运行中', 'pid': game_process.pid}
        
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(current_dir)
        backend_dir = os.path.join(project_root, 'backend')
        main_py = os.path.join(backend_dir, 'main.py')
        
        if not os.path.exists(main_py):
            return {'success': False, 'message': f'main.py 不存在'}
        
        try:
            print(f"\n{'='*50}")
            print(f"🎮 启动狼人杀游戏...")
            print(f"{'='*50}\n")
            
            # 启动游戏进程，输出到控制台（与直接运行 main.py 一样）
            if sys.platform == 'win32':
                game_process = subprocess.Popen(
                    [sys.executable, main_py],
                    cwd=backend_dir,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
                )
            else:
                game_process = subprocess.Popen(
                    [sys.executable, main_py],
                    cwd=backend_dir,
                    start_new_session=True
                )
            
            return {'success': True, 'message': '游戏已启动，请等待日志生成...', 'pid': game_process.pid}
        except Exception as e:
            return {'success': False, 'message': f'启动失败: {str(e)}'}
    
    def stop_game(self):
        """停止游戏"""
        global game_process
        
        if game_process is None or game_process.poll() is not None:
            return {'success': False, 'message': '没有正在运行的游戏'}
        
        try:
            # 发送终止信号
            if sys.platform == 'win32':
                game_process.terminate()
            else:
                os.kill(game_process.pid, signal.SIGTERM)
            
            # 等待进程结束
            game_process.wait(timeout=5)
            game_process = None
            return {'success': True, 'message': '游戏已停止'}
        except subprocess.TimeoutExpired:
            game_process.kill()
            game_process = None
            return {'success': True, 'message': '游戏已强制停止'}
        except Exception as e:
            return {'success': False, 'message': f'停止失败: {str(e)}'}
    
    def do_OPTIONS(self):
        """处理CORS预检请求"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f"[{self.log_date_time_string()}] {format % args}")

def cleanup_game_process():
    """清理游戏进程"""
    global game_process
    if game_process is not None:
        try:
            if game_process.poll() is None:  # 进程仍在运行
                print("\n🛑 正在终止游戏进程...")
                if sys.platform == 'win32':
                    game_process.terminate()
                else:
                    os.kill(game_process.pid, signal.SIGTERM)
                
                try:
                    game_process.wait(timeout=3)
                    print("✓ 游戏进程已正常终止")
                except subprocess.TimeoutExpired:
                    game_process.kill()
                    print("✓ 游戏进程已强制终止")
        except Exception as e:
            print(f"⚠ 终止游戏进程时出错: {e}")
        finally:
            game_process = None

def run_server(port=8080):
    """运行服务器"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, LogServerHandler)
    print(f"🚀 WolfMind服务器启动成功！")
    print(f"📍 访问地址: http://localhost:{port}")
    print(f"📂 日志目录: backend/data/game_logs")
    print(f"⏹️  按 Ctrl+C 停止服务器\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n⏹️ 正在关闭服务器...")
        # 先终止游戏进程
        cleanup_game_process()
        # 再关闭服务器
        httpd.shutdown()
        print("👋 服务器已停止")

if __name__ == '__main__':
    run_server()
