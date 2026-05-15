#!/bin/bash

# 在线考试系统 - Docker 管理脚本
# 用途: 快速部署、管理和维护应用

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数: 打印带颜色的消息
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# 函数: 检查 Docker 和 Docker Compose
check_docker() {
    print_status "检查 Docker 环境..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装"
        exit 1
    fi
    print_success "Docker 已安装: $(docker --version)"
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装"
        exit 1
    fi
    print_success "Docker Compose 已安装: $(docker-compose --version)"
}

# 函数: 检查环境文件
check_env() {
    print_status "检查环境文件..."
    
    if [ ! -f ".env" ]; then
        print_warning ".env 文件不存在"
        if [ -f ".env.docker" ]; then
            print_status "从 .env.docker 创建 .env..."
            cp .env.docker .env
            print_warning "请编辑 .env 文件并修改敏感信息"
            return 1
        fi
        print_error "找不到 .env.docker 文件"
        exit 1
    fi
    print_success ".env 文件存在"
}

# 函数: 生成 JWT_SECRET
generate_jwt_secret() {
    print_status "生成 JWT_SECRET..."
    
    if command -v openssl &> /dev/null; then
        JWT=$(openssl rand -hex 32)
        print_success "生成的密钥: $JWT"
        
        # 提示用户更新 .env
        print_warning "请在 .env 文件中更新: JWT_SECRET=$JWT"
    else
        print_error "openssl 未安装，无法生成密钥"
        exit 1
    fi
}

# 函数: 启动应用
start_app() {
    print_status "启动应用..."
    
    docker-compose up -d
    
    sleep 10
    
    print_status "等待服务启动..."
    sleep 10
    
    print_status "检查服务状态..."
    docker-compose ps
    
    print_success "应用启动完成"
}

# 函数: 停止应用
stop_app() {
    print_status "停止应用..."
    docker-compose down
    print_success "应用已停止"
}

# 函数: 重启应用
restart_app() {
    print_status "重启应用..."
    docker-compose restart
    print_success "应用已重启"
}

# 函数: 查看日志
view_logs() {
    local service=${1:-app}
    print_status "查看 $service 日志..."
    docker-compose logs -f --tail=50 "$service"
}

# 函数: 进入容器
enter_container() {
    local service=${1:-app}
    print_status "进入 $service 容器..."
    docker-compose exec "$service" bash
}

# 函数: 测试应用
test_app() {
    print_status "测试应用健康状态..."
    
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|301"; then
        print_success "应用响应正常"
    else
        print_error "应用无响应"
        return 1
    fi
    
    print_status "测试 MySQL 连接..."
    if docker-compose exec -T mysql mysql -u examuser -p$(grep MYSQL_PASSWORD .env | cut -d= -f2) exam_db -e "SELECT 1;" &> /dev/null; then
        print_success "MySQL 连接正常"
    else
        print_error "MySQL 连接失败"
        return 1
    fi
}

# 函数: 备份数据库
backup_database() {
    print_status "备份数据库..."
    
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
    local mysql_password=$(grep MYSQL_PASSWORD .env | cut -d= -f2)
    
    docker-compose exec -T mysql mysqldump -u examuser -p"$mysql_password" exam_db > "$backup_file"
    
    if [ -f "$backup_file" ]; then
        print_success "数据库备份完成: $backup_file"
        ls -lh "$backup_file"
    else
        print_error "备份失败"
        return 1
    fi
}

# 函数: 恢复数据库
restore_database() {
    local backup_file=$1
    
    if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
        print_error "备份文件不存在: $backup_file"
        print_status "使用方法: $0 restore <backup_file>"
        return 1
    fi
    
    print_warning "即将恢复数据库，所有当前数据将被覆盖"
    read -p "确认继续吗? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_status "已取消"
        return 0
    fi
    
    local mysql_password=$(grep MYSQL_PASSWORD .env | cut -d= -f2)
    
    print_status "恢复数据库..."
    docker-compose exec -T mysql mysql -u examuser -p"$mysql_password" exam_db < "$backup_file"
    
    print_success "数据库恢复完成"
}

# 函数: 重建镜像
rebuild_images() {
    print_status "重建镜像..."
    docker-compose build --no-cache
    print_success "镜像重建完成"
}

# 函数: 清理未使用的资源
cleanup() {
    print_status "清理未使用的 Docker 资源..."
    
    docker image prune -f
    docker volume prune -f
    docker container prune -f
    
    print_success "清理完成"
}

# 函数: 显示资源使用
stats() {
    print_status "容器资源使用统计..."
    docker stats
}

# 函数: 显示帮助信息
show_help() {
    cat << EOF
${BLUE}在线考试系统 - Docker 管理脚本${NC}

${GREEN}使用方法:${NC}
    $0 [命令]

${GREEN}可用命令:${NC}
    init              初始化环境（检查 Docker 和配置文件）
    start             启动应用
    stop              停止应用
    restart           重启应用
    logs [service]    查看日志 (默认: app)
    shell [service]   进入容器 (默认: app)
    test              测试应用健康状态
    build             重建 Docker 镜像
    backup            备份数据库
    restore <file>    恢复数据库
    cleanup           清理未使用的 Docker 资源
    stats             显示资源使用统计
    genkey            生成 JWT_SECRET
    help              显示此帮助信息

${GREEN}示例:${NC}
    $0 start           # 启动应用
    $0 logs app        # 查看应用日志
    $0 backup          # 备份数据库
    $0 restore backup_20240101_000000.sql  # 恢复数据库

${GREEN}常见任务:${NC}
    # 首次部署
    $0 init && $0 start && $0 test

    # 更新应用
    git pull && $0 build && $0 restart

    # 日常维护
    $0 logs           # 查看日志
    $0 stats          # 查看资源使用
    $0 backup         # 备份数据库

EOF
}

# 主程序
main() {
    local command=${1:-help}
    
    case "$command" in
        init)
            check_docker
            check_env
            print_success "环境检查完成"
            ;;
        start)
            check_docker
            check_env || { print_warning "请先编辑 .env 文件"; exit 1; }
            start_app
            ;;
        stop)
            check_docker
            stop_app
            ;;
        restart)
            check_docker
            restart_app
            ;;
        logs)
            check_docker
            view_logs "${2:-app}"
            ;;
        shell)
            check_docker
            enter_container "${2:-app}"
            ;;
        test)
            check_docker
            test_app
            ;;
        build)
            check_docker
            rebuild_images
            ;;
        backup)
            check_docker
            backup_database
            ;;
        restore)
            check_docker
            restore_database "$2"
            ;;
        cleanup)
            check_docker
            cleanup
            ;;
        stats)
            check_docker
            stats
            ;;
        genkey)
            generate_jwt_secret
            ;;
        help)
            show_help
            ;;
        *)
            print_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 运行主程序
main "$@"
